// ─── v499 — the devotional player repair (Guideposts) ──────────────────────
// Jonathan approved the v5 Guideposts mockup after panning v497 on
// his phone: the collapse washed to a blank salmon screen and
// popped back into the chapter, the page pushed everything to the
// top with the words hidden behind a fold, the play button sat off
// centre, and the family "wasn't really red". The repair, pinned
// here:
//  - PAGE: header row with the collapse chevron at the TOP RIGHT,
//    the big-idea line sourced only from his text, the hero row's
//    facts column, the play button exactly at the page centre,
//    guideposts only from real timed movement data, and the
//    follow-along flowing in the page column — no fold.
//  - COLOUR: re-anchored on the ROYGBIV band hues, saturation held
//    — Genesis pinned by the drawing (primary #A8150C, ground
//    #F6D0C8), every other book at the same S/L stops.
//  - TRANSITION: transparent route over the mounted chapter, one
//    progress value, content out over p 0→0.45, pill face in over
//    p 0.55→1, bounds landing exactly on the pill seat, and a
//    hand-off flag so the root pill never replays an arrival.
//  - STOP leaves nothing behind: after stopDevotional the
//    controller is idle, and only three surfaces consume the
//    player state at all — the listen view, the pill, the route.

import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import {
  devotionalBigIdea,
  devotionalFacts,
  devotionalGuideposts,
  devotionalRegistry,
  getDevotional,
  type Devotional,
} from '../devotionals';

const DEVOTIONALS = devotionalRegistry();
import {
  DEVOTIONAL_COLLAPSE_CONTENT_OUT_END,
  DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX,
  DEVOTIONAL_COLLAPSE_PILL_IN_START,
  DEVOTIONAL_COLLAPSE_THRESHOLD,
  devotionalMorphBounds,
  devotionalMorphContentOpacity,
  devotionalMorphContentTranslateY,
  devotionalMorphPillFaceOpacity,
  devotionalPlayerTheme,
} from '../devotional-player-theme';
import { BOOK_HUE_LIGHT, bookHueFor } from '../bible-v205/book-colors';
import { hexToHsl } from '../skin-themes';

const root = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const genesis12 = getDevotional('Genesis', 12)!;
const synthetic = (over: Partial<Devotional>): Devotional => ({ ...genesis12, ...over });

describe('v499 page — header, in source', () => {
  const listen = read('components/devotional-listen.tsx');

  it('the collapse chevron sits at the TOP RIGHT of a header row, wired to the same collapse as the drag', () => {
    expect(listen).toContain('styles.headerRow');
    expect(listen).toContain('onPress={minimize}');
    expect(listen).toContain('accessibilityLabel="Minimize player"');
    expect(listen).toContain('const minimize = () => settleCollapse(true);');
    // The header row (kicker + chevron) comes before the title,
    // and the old floating top row is gone.
    expect(listen.indexOf('styles.headerRow')).toBeLessThan(listen.indexOf('styles.title'));
    expect(listen).not.toContain('topRow');
    expect(listen).not.toContain('headerStyle');
    // The kicker carries the chapter context, uppercased by style.
    expect(listen).toContain("{devotional.book} {devotional.chapter} · Devotional");
    expect(listen).toContain("textTransform: 'uppercase'");
  });

  it('the play button is EXACTLY at the page centre — absolute, not flex-grouped', () => {
    const playBtn = listen.slice(listen.indexOf('playBtn: {'), listen.indexOf('panel: {'));
    expect(playBtn).toContain("left: '50%'");
    expect(playBtn).toContain('marginLeft: -32');
    expect(playBtn).toContain('width: 64');
    expect(playBtn).toContain('height: 64');
    expect(playBtn).toContain('borderRadius: 32');
    // The Stop pill anchors the row's left margin instead.
    const stopBtn = listen.slice(listen.indexOf('stopBtn: {'), listen.indexOf('playBtn: {'));
    expect(stopBtn).toContain('left: 0');
  });

  it('the follow-along has NO fold: it is a memoised subtree rendered in the page flow', () => {
    expect(listen).toContain('const FollowAlong = memo(');
    expect(listen).toContain('<FollowAlong');
    // Rendered unconditionally in the column — the JSX is not
    // gated behind a conditional the way v497's sheet was.
    const idx = listen.indexOf('<FollowAlong');
    const before = listen.slice(Math.max(0, idx - 200), idx);
    expect(before).not.toContain('? (');
    expect(before).not.toContain('&& (');
    // The guideposts panel is memoised too, so the morph never
    // re-renders either subtree frame by frame.
    expect(listen).toContain('const GuidepostsPanel = memo(');
  });

  it('the guideposts section renders ONLY behind the data gate', () => {
    expect(listen).toContain('IN THIS CHAPTER');
    expect(listen).toContain('{guideposts ? (');
    expect(listen).toContain('const guideposts = devotionalGuideposts(devotional);');
    // The big-idea line is gated the same way.
    expect(listen).toContain('{bigIdea ? (');
  });

  it('reduce motion follows the codebase pattern (jump to the end state)', () => {
    expect(listen).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    expect(listen).toContain("'reduceMotionChanged'");
    expect(listen).toContain('reducedMotionRef.current ? 0 : DEVOTIONAL_COLLAPSE_SETTLE_MS');
  });
});

describe('v499 big-idea line — sourced from his text only', () => {
  it('a dedicated field wins when an entry carries one', () => {
    expect(devotionalBigIdea(synthetic({ bigIdea: '  God calls a man out. ' }))).toBe('God calls a man out.');
  });

  it('otherwise the first paragraph supplies it — first sentence when the paragraph is long', () => {
    const long =
      'Abram hears a voice he has never heard before and it changes everything about his life. ' +
      'He packs up a household, a wife, a nephew, and every possession he owns, and walks toward a land he cannot name.';
    expect(long.length).toBeGreaterThan(120);
    expect(devotionalBigIdea(synthetic({ paragraphs: [long] }))).toBe(
      'Abram hears a voice he has never heard before and it changes everything about his life.',
    );
  });

  it('a short first paragraph is used whole', () => {
    expect(devotionalBigIdea(synthetic({ paragraphs: ['A short opening word.'] }))).toBe('A short opening word.');
  });

  it('no field and no paragraphs → no line (the page composes without it)', () => {
    expect(devotionalBigIdea(synthetic({ paragraphs: [] }))).toBeNull();
    expect(devotionalBigIdea(synthetic({ paragraphs: ['', '   '] }))).toBeNull();
  });

  it('every shipped entry renders without the line today — nothing is fabricated', () => {
    expect(DEVOTIONALS.length).toBeGreaterThan(0);
    for (const d of DEVOTIONALS) expect(devotionalBigIdea(d)).toBeNull();
  });
});

describe('v499 guideposts — real timed movements or nothing', () => {
  it('a valid movements list passes through', () => {
    const d = synthetic({
      durationSec: 600,
      movements: [
        { title: 'The call', startSec: 0 },
        { title: 'The promise', startSec: 210 },
      ],
    });
    expect(devotionalGuideposts(d)).toEqual([
      { title: 'The call', startSec: 0 },
      { title: 'The promise', startSec: 210 },
    ]);
  });

  it('broken lists read as absent: too few, blank title, out of range, not increasing', () => {
    expect(devotionalGuideposts(synthetic({ durationSec: 600, movements: [{ title: 'Only', startSec: 0 }] }))).toBeNull();
    expect(
      devotionalGuideposts(
        synthetic({
          durationSec: 600,
          movements: [
            { title: '  ', startSec: 0 },
            { title: 'B', startSec: 10 },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      devotionalGuideposts(
        synthetic({
          durationSec: 600,
          movements: [
            { title: 'A', startSec: 0 },
            { title: 'B', startSec: 600 },
          ],
        }),
      ),
    ).toBeNull();
    expect(
      devotionalGuideposts(
        synthetic({
          durationSec: 600,
          movements: [
            { title: 'A', startSec: 100 },
            { title: 'B', startSec: 100 },
          ],
        }),
      ),
    ).toBeNull();
    expect(devotionalGuideposts(synthetic({ movements: undefined }))).toBeNull();
  });

  it('NO shipped entry carries movement data — the section renders nowhere rather than inventing times', () => {
    // The narrations ship with no timing data anywhere (see the
    // honesty note at activeParagraphIndex in lib/devotionals.ts),
    // and his commentary's sections carry no audio times.
    for (const d of DEVOTIONALS) expect(devotionalGuideposts(d)).toBeNull();
  });
});

describe('v499 facts column — from the app’s own data', () => {
  it('Genesis 12 reads exactly as the drawing draws it', () => {
    const facts = devotionalFacts(genesis12, 20, genesis12.durationSec);
    expect(facts.range).toBe('Genesis 12:1–20');
    expect(facts.chapterLine).toBe('Chapter 12 of 50');
    expect(facts.durationLine).toContain('· a reading of his commentary');
  });

  it('the range waits for the verses: unknown last verse → no range line', () => {
    const facts = devotionalFacts(genesis12, null, genesis12.durationSec);
    expect(facts.range).toBeNull();
    expect(facts.chapterLine).toBe('Chapter 12 of 50');
  });

  it('the verses load through the app’s Bible-data path', () => {
    const listen = read('components/devotional-listen.tsx');
    expect(listen).toContain('loadChapterVerses(devotional.book, devotional.chapter)');
  });
});

describe('v499 colour — band hues, saturation held', () => {
  const genesis = devotionalPlayerTheme('Genesis', false);

  it('Genesis light stops are the drawing’s, exactly', () => {
    expect(genesis.primary).toBe('#A8150C');
    expect(genesis.accent).toBe('#7E0E05');
    expect(genesis.ground).toBe('#F6D0C8');
    expect(genesis.panel).toBe('#F0BCAE');
    expect(genesis.stopSeat).toBe('#EBAE9C');
    expect(genesis.ink).toBe('#2E0F0A');
    expect(genesis.track).toBe('#E3A08D');
    expect(genesis.fill).toBe('#8D0E07');
    expect(genesis.fillDeep).toBe('#720A03');
    expect(genesis.pillFrom).toBe('#B4170E');
    expect(genesis.pillTo).toBe('#9B1209');
    expect(genesis.inkSoft).toBe('#854B47');
  });

  it('Genesis dark stops follow the v497 dark pattern on the new anchors', () => {
    const dark = devotionalPlayerTheme('Genesis', true);
    expect(dark.primary).toBe('#E25850');
    expect(dark.accent).toBe('#EA9F99');
    expect(dark.ground).toBe('#1D0F0C');
    expect(dark.panel).toBe('#2E1A15');
    expect(dark.track).toBe('#8D4935');
    expect(dark.stopSeat).toBe('#643426');
    expect(dark.fill).toBe('#DF2B20');
    expect(dark.fillDeep).toBe('#C11F15');
    expect(dark.pillFrom).toBe('#DE3F35');
    expect(dark.pillTo).toBe('#D2281E');
    expect(dark.ink).toBe('#F7E6E3');
    expect(dark.inkSoft).toBe('#CA9491');
  });

  it('other books anchor on THEIR band hue at the same S/L stops (Joshua, Hebrews)', () => {
    const hueOf = (hex: string) => hexToHsl(hex).h;
    const bandHue = (book: string) => hueOf(BOOK_HUE_LIGHT[bookHueFor(book)!].primary);
    const hueGap = (a: number, b: number) => {
      const d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    };
    for (const book of ['Joshua', 'Hebrews']) {
      const t = devotionalPlayerTheme(book, false);
      // Primary hue = band hue + the pinned primary's hue offset.
      expect(hueGap(hueOf(t.primary), bandHue(book) + 3.461538)).toBeLessThan(2);
      // Ground hue = band hue + the pinned ground's hue offset.
      expect(hueGap(hueOf(t.ground), bandHue(book) + 10.434783)).toBeLessThan(2);
      // Saturation and lightness are HELD at the pinned stops.
      expect(hexToHsl(t.primary).s).toBeCloseTo(0.866667, 2);
      expect(hexToHsl(t.primary).l).toBeCloseTo(0.352941, 2);
      expect(t.primary).not.toBe(genesis.primary);
    }
  });
});

describe('v499 transition — the demo’s mapping', () => {
  it('the windows are the drawing’s: content out by 0.45, pill face in from 0.55, travel 14px', () => {
    expect(DEVOTIONAL_COLLAPSE_CONTENT_OUT_END).toBe(0.45);
    expect(DEVOTIONAL_COLLAPSE_PILL_IN_START).toBe(0.55);
    expect(DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX).toBe(14);
    expect(DEVOTIONAL_COLLAPSE_THRESHOLD).toBe(0.35);
  });

  it('content opacity and travel follow the out-window', () => {
    expect(devotionalMorphContentOpacity(0)).toBe(1);
    expect(devotionalMorphContentOpacity(0.225)).toBeCloseTo(0.5, 6);
    expect(devotionalMorphContentOpacity(0.45)).toBe(0);
    expect(devotionalMorphContentOpacity(1)).toBe(0);
    expect(devotionalMorphContentTranslateY(0)).toBeCloseTo(0, 6);
    expect(devotionalMorphContentTranslateY(0.225)).toBeCloseTo(-7, 6);
    expect(devotionalMorphContentTranslateY(0.45)).toBe(-14);
  });

  it('the pill face follows the in-window — and the surface is never blank between the windows', () => {
    expect(devotionalMorphPillFaceOpacity(0)).toBe(0);
    expect(devotionalMorphPillFaceOpacity(0.55)).toBe(0);
    expect(devotionalMorphPillFaceOpacity(0.775)).toBeCloseTo(0.5, 6);
    expect(devotionalMorphPillFaceOpacity(1)).toBe(1);
    // At the midpoint neither layer is up: what shows is the
    // coloured surface itself, mid-shrink — by design, not a gap.
    expect(devotionalMorphContentOpacity(0.5)).toBe(0);
    expect(devotionalMorphPillFaceOpacity(0.5)).toBe(0);
  });

  it('bounds land EXACTLY on the pill seat at p = 1 and the full frame at p = 0', () => {
    const seat = { pillTop: 700, pillBottom: 86, pillSide: 14, pillHeight: 66 };
    expect(devotionalMorphBounds(0, seat)).toEqual({ left: 0, right: 0, top: 0, bottom: 0, borderRadius: 0 });
    expect(devotionalMorphBounds(1, seat)).toEqual({ left: 14, right: 14, top: 700, bottom: 86, borderRadius: 33 });
    const mid = devotionalMorphBounds(0.5, seat);
    expect(mid.left).toBe(7);
    expect(mid.top).toBe(350);
    expect(mid.borderRadius).toBe(16.5);
  });

  it('the screen drives its animated styles from these same windows and hands off before closing', () => {
    const listen = read('components/devotional-listen.tsx');
    expect(listen).toContain('DEVOTIONAL_COLLAPSE_CONTENT_OUT_END');
    expect(listen).toContain('DEVOTIONAL_COLLAPSE_PILL_IN_START');
    expect(listen).toContain('DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX');
    // The flag is raised BEFORE the route closes.
    const handoff = listen.slice(listen.indexOf('const handOffAndBack'), listen.indexOf('const settleCollapse'));
    expect(handoff.indexOf('requestDevotionalPillHandoff();')).toBeLessThan(handoff.indexOf('onBackRef.current();'));
    // The pill consumes it on becoming visible again.
    const pill = read('components/devotional-pill.tsx');
    expect(pill).toContain('consumeDevotionalPillHandoff()');
  });

  it('the route presents transparently with no stack animation of its own', () => {
    const route = read('app/devotional.tsx');
    expect(route).toContain("presentation: 'transparentModal'");
    expect(route).toContain("animation: 'none'");
    expect(route).toContain("backgroundColor: 'transparent'");
    // And the fallback keeps an opaque Bible ground — it never
    // floats text over the chapter.
    expect(route).toContain('backgroundColor: palette.paper');
  });
});

// The controller half needs the same expo-audio fake v293/v497 use.
vi.mock('expo-audio', () => ({
  createAudioPlayer: () => ({
    play() {},
    pause() {},
    seekTo() {
      return Promise.resolve();
    },
    replace() {},
    addListener() {
      return { remove() {} };
    },
    remove() {},
  }),
}));

import {
  consumeDevotionalPillHandoff,
  getDevotionalPlayerSnapshot,
  openDevotional,
  requestDevotionalPillHandoff,
  stopDevotional,
} from '../devotional-player';

describe('v499 hand-off flag — one-shot, like the expand flag', () => {
  it('request then consume reads true exactly once', () => {
    expect(consumeDevotionalPillHandoff()).toBe(false);
    requestDevotionalPillHandoff();
    expect(consumeDevotionalPillHandoff()).toBe(true);
    expect(consumeDevotionalPillHandoff()).toBe(false);
  });
});

describe('v499 post-Stop cleanliness', () => {
  it('after stopDevotional the controller holds no session at all', () => {
    openDevotional(genesis12, 101);
    expect(getDevotionalPlayerSnapshot().devotional).not.toBeNull();
    stopDevotional();
    const s = getDevotionalPlayerSnapshot();
    expect(s.devotional).toBeNull();
    expect(s.playing).toBe(false);
    expect(s.positionSec).toBe(0);
  });

  it('only the player surfaces consume the session state — no chapter-screen chip exists to strand', () => {
    // The "stray Stop bar" in Jonathan's v497 recording was the
    // phone's screen-recorder toolbar, not app UI: this scan pins
    // the structural fact — the session state has exactly three
    // consumers (route, listen view, pill), so when the controller
    // clears, nothing anywhere can keep showing session UI.
    const consumers = new Set<string>();
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (name !== '__tests__' && name !== 'node_modules') walk(p);
        } else if (/\.(ts|tsx)$/.test(name)) {
          if (readFileSync(p, 'utf8').includes('useDevotionalPlayerState()')) consumers.add(p.slice(root.length + 1));
        }
      }
    };
    walk(join(root, 'app'));
    walk(join(root, 'components'));
    expect([...consumers].sort()).toEqual(['app/devotional.tsx', 'components/devotional-listen.tsx', 'components/devotional-pill.tsx']);
    // The pill renders nothing without a session.
    const pill = read('components/devotional-pill.tsx');
    expect(pill).toContain("if (!devotional || pathname === '/devotional') return null;");
  });
});
