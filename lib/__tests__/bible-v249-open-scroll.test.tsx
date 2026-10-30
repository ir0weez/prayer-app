// ─── v249 "Scroll While It's Open" — pins ─────────────────────────────────
// His rulings (2026-10-25 15:17 + 15:21, the second with video):
// the greyout/blur around an open bubble is FINE and the open box's
// WIDTH is fine — but the page must SCROLL while the bubble is open
// (v244 locked it), a quick tap outside the bubble closes it, a drag
// is a scroll and never a close, the bubble stays anchored to its
// verse while the page moves, and the weird shading at the open
// box's bottom corners goes. Plus: face taps kept toggling the VERSE
// row instead of opening the bubble — the face gets a hit target of
// its own, and every toggle becomes a set, not a flip, so mid-bloom
// taps converge instead of racing.
//
// Harness limit, stated plainly (as in v247): the web renderer
// cannot reproduce Android's elevation-shadow silhouette or native
// gesture negotiation. What these pins hold is the contract that
// produces the behavior on device: the layering/geometry decisions
// in source, the pure hit-box math, and the rendered state machine
// (closed → face target up, no blur; open → blur + catcher up, face
// target stood down).

import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async (k: string) => store.get(k) ?? null),
    setItem: vi.fn(async (k: string, v: string) => {
      store.set(k, v);
    }),
    removeItem: vi.fn(async (k: string) => {
      store.delete(k);
    }),
    clear: vi.fn(async () => {
      store.clear();
    }),
  },
}));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  const { View, ScrollView } = await import('react-native-web');
  const AV = (props: any) => React.createElement(View, props, props?.children);
  return {
    __esModule: true,
    default: { View: AV, ScrollView, createAnimatedComponent: (c: any) => c },
    View: AV,
    ScrollView,
    useSharedValue: (v: any) => ({ value: v }),
    makeMutable: (v: any) => ({ value: v }),
    // Styles resolve at progress 0 (the closed geometry) — enough to
    // render both states' conditional furniture.
    useAnimatedStyle: (fn: any) => fn(),
    interpolate: (_v: any, _input: any, output: any[]) => output[0],
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    withRepeat: (v: any) => v,
    Easing: { bezier: () => ({}), inOut: (e: any) => e, sin: {}, out: (e: any) => e },
  };
});

vi.mock('expo-blur', async () => {
  const React = await import('react');
  return {
    BlurView: (props: any) =>
      React.createElement('div', { 'data-blurview': String(props.intensity ?? '') }, props?.children),
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/avatar-system', async () => {
  const React = await import('react');
  return { AvatarImage: () => React.createElement('div', { 'data-avatar': '1' }) };
});

import type { Person } from '../prayercircle-data';
import { emptyMarks, type MarksMap } from '../bible-v205/marks';
import type { SplitSectionsResult } from '../bible-v205/index';
import { buildBubblePieces, faceStackHitBox } from '../bible-v205/bubbles';
import { LivingBubbles } from '../../components/bible-v205/bubbles';
import type { BiblePalette } from '../../components/bible-v205/palette';

const bubblesSrc = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'bubbles.tsx'), 'utf8');
const pageSrc = readFileSync(join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'), 'utf8');

const RANDEE: Person = {
  id: 'p-randee',
  name: 'Randee',
  initials: 'R',
  relationship: 'Friends',
  lastPrayedDate: null,
  reminderDaysOfWeek: [],
  accentColor: '#B45BC2',
  avatarColor: '#B45BC2',
  prayerItems: [],
} as Person;

const PALETTE = {
  paper: '#FFF9F0',
  ink: '#33231F',
  inkSoft: '#6B5750',
  line: '#E4D8CE',
  lineDark: '#C9B4A6',
  isDark: false,
  rasp: '#C2185B',
  yellowBg: '#FDF3D8',
  yellowBorder: '#E8CF87',
  yellowInk: '#4A3A10',
  yellowLabel: '#96791A',
  greyBg: '#F1EDE8',
  greyBorder: '#D8CFC6',
  greyInk: '#3E3630',
  greyLabel: '#6D5E52',
} as unknown as BiblePalette;

function pieceWithOneLine() {
  const marks: MarksMap = {
    'Genesis|1|1-2': {
      ...emptyMarks(),
      notes: [{ text: 'Randee noted this.', authorId: 'p-randee', authorName: 'Randee' }],
    },
  };
  const split = {
    sections: [
      {
        start: 1,
        end: 2,
        title: null,
        entries: [{ start: 1, end: 2, blocks: [], verseOnly: false }],
      },
    ],
    marks,
    provenance: {},
  } as unknown as SplitSectionsResult;
  const piece = buildBubblePieces(split, 'Genesis', 1).get('Genesis|1|1-2');
  if (!piece) throw new Error('fixture piece missing');
  return piece;
}

function renderLayer(open: boolean): string {
  return renderToString(
    React.createElement(LivingBubbles, {
      piece: pieceWithOneLine(),
      people: [RANDEE],
      profile: { name: 'Jonathan' },
      palette: PALETTE,
      open,
      bloom: { duration: 380, easing: (x: number) => x },
      versesBottom: 120,
      viewportHeight: 800,
      topChrome: 130,
      bottomReserve: 112,
      entryScreenTop: 200,
      onToggle: () => undefined,
      onEditLine: () => undefined,
      onRemoveLine: () => undefined,
    }),
  );
}

// ─── (a) The page scrolls while a thread is open ────────────────────────────

describe('v249 — no page scroll lock; the thread keeps its own internal scroll', () => {
  it('the chapter page no longer disables its ScrollView for an open bubble', () => {
    expect(pageSrc).not.toContain('scrollEnabled={!openBubblesKey}');
    // v361 amendment: the ScrollView carries exactly one lock, and
    // it is NOT the bubble's — a live text drag-selection holds the
    // page still so the drag and the scroll never fight over one
    // finger (his approved selection model). An open bubble thread
    // still never locks the page: v249's ruling stands untouched.
    expect(pageSrc).toContain('scrollEnabled={!selectionDrag}');
    expect(pageSrc).not.toContain('scrollEnabled={!openBubbles');
  });

  it('the Living Bubble layer renders INSIDE the page ScrollView (content coordinates — it rides with the chapter, anchored to its entry)', () => {
    // EntryView is a separate function later in the file, but the
    // page INVOKES it between the ScrollView's tags, and EntryView's
    // own JSX is where the layer mounts — so the bubbles live in the
    // ScrollView's content tree, not in an overlay above it.
    const scrollOpen = pageSrc.indexOf('<ScrollView\n');
    const entryInvoke = pageSrc.indexOf('<EntryView');
    const scrollClose = pageSrc.indexOf('</ScrollView>');
    expect(scrollOpen).toBeGreaterThan(-1);
    expect(entryInvoke).toBeGreaterThan(scrollOpen);
    expect(entryInvoke).toBeLessThan(scrollClose);
    expect(pageSrc).toContain('<LivingBubbles');
  });

  it('a tall conversation still scrolls internally (the v214 amendment is untouched)', () => {
    expect(bubblesSrc).toContain('scrollEnabled={open && scrollReady && scrollable}');
    expect(bubblesSrc).toContain('pointerEvents={open && scrollable ? \'auto\' : \'box-none\'}');
  });

  it('the blur strips over-cover so the greyout survives scroll travel', () => {
    // Bottom strip runs two screens down from the verses' foot…
    expect(bubblesSrc).toContain('top: headBottom, height: window.height * 2');
    // …and the top strip reaches a screen above the viewport top.
    expect(bubblesSrc).toContain('top: -(props.entryScreenTop + window.height)');
    expect(bubblesSrc).toContain('height: props.entryScreenTop + window.height');
  });
});

// ─── (b) A tap outside closes — and is consumed ─────────────────────────────

describe('v249 — tap-outside closes', () => {
  it('every close path is a SET to closed, issued from a plain onPress', () => {
    // Two blur strips and the band catcher close via onPress…
    const closes = bubblesSrc.match(/onPress=\{\(\) => requestToggle\(false\)\}/g) ?? [];
    expect(closes.length).toBe(3);
    // …and the open card's own press closes via its onPressCard —
    // also a set, never a flip.
    expect(bubblesSrc).toContain('onPressCard={() => requestToggle(false)}');
    // The one open path is a SET to open, from the face target.
    const opens = bubblesSrc.match(/onPress=\{\(\) => requestToggle\(true\)\}/g) ?? [];
    expect(opens.length).toBe(1);
  });

  it('the band catcher exists: region geometry, under the cards, over the strips', () => {
    expect(bubblesSrc).toContain('styles.tapCatcher');
    expect(bubblesSrc).toContain("tapCatcher: { position: 'absolute', left: 0, right: 0, zIndex: 15 }");
    expect(bubblesSrc).toContain('blurStrip: { position: \'absolute\', zIndex: 14 }');
    expect(bubblesSrc).toContain("region: { position: 'absolute', left: 0, right: 0, zIndex: 26 }");
  });

  it('rendered open: the blur and the open card are up; the face target stands down', () => {
    const html = renderLayer(true);
    expect((html.match(/data-blurview/g) ?? []).length).toBe(2);
    expect(html).toContain('Randee noted this.');
    expect(html).not.toContain('Open the notes on these verses');
  });

  it('the back/edge-swipe close is untouched in the page', () => {
    expect(pageSrc).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(pageSrc).toContain('setOpenBubblesKey(null);');
  });
});

// ─── (c) A drag is a scroll, never a tap ────────────────────────────────────

describe('v249 — scrolling can never trigger the outside-tap close', () => {
  it('no close path hangs off a touch/move hook — presses only, which the page ScrollView cancels when a drag becomes a scroll', () => {
    expect(bubblesSrc).not.toContain('onTouchStart');
    expect(bubblesSrc).not.toContain('onTouchEnd');
    expect(bubblesSrc).not.toContain('onResponderGrant');
    expect(bubblesSrc).not.toContain('onResponderMove');
    expect(bubblesSrc).not.toContain('onLongPress');
    // requestToggle is invoked ONLY from press handlers (the four
    // onPress sites plus the card's onPressCard) — plus its own
    // definition, which takes a boolean, not a literal.
    const all = bubblesSrc.match(/requestToggle\((?:true|false)\)/g) ?? [];
    const viaPress = bubblesSrc.match(/onPress=\{\(\) => requestToggle\((?:true|false)\)\}/g) ?? [];
    const viaCard = bubblesSrc.match(/onPressCard=\{\(\) => requestToggle\((?:true|false)\)\}/g) ?? [];
    expect(all.length).toBe(viaPress.length + viaCard.length);
    expect(all.length).toBe(5);
  });
});

// ─── (d) The bottom-corner shading: the card's shadow learns its shape ─────

describe('v249 — the open card’s static radius kills the square shadow', () => {
  it('the card style carries borderRadius 16 STATICALLY (the Android elevation outline reads the static style)', () => {
    expect(bubblesSrc).toContain('borderRadius: 16,\n    borderWidth: 1.5,');
  });

  it('the drawn radius still morphs from the face’s circle to 16 — the bloom is unchanged', () => {
    expect(bubblesSrc).toContain('borderRadius: interpolate(p, [0, 1], [FACE_SIZE / 2, 16])');
    expect(bubblesSrc).toContain('shadowOpacity: interpolate(p, [0, 1], [0, 0.3])');
    expect(bubblesSrc).toContain('elevation: interpolate(p, [0, 1], [0, 8])');
  });
});

// ─── (e) The face’s own hit target + set-semantics convergence ──────────────

describe('v249 — the face hit box is the whole cascade (pure)', () => {
  it('a lone face: exactly the disc', () => {
    expect(faceStackHitBox({ count: 1, faceSize: 51, stackStepX: 28, stackStepY: 3 })).toEqual({
      width: 51,
      height: 51,
    });
  });

  it('a stack: the union of every cascaded disc', () => {
    expect(faceStackHitBox({ count: 3, faceSize: 51, stackStepX: 28, stackStepY: 3 })).toEqual({
      width: 51 + 2 * 28,
      height: 51 + 2 * 3,
    });
    expect(faceStackHitBox({ count: 2, faceSize: 51, stackStepX: 28, stackStepY: 3 })).toEqual({
      width: 79,
      height: 54,
    });
  });

  it('a degenerate count clamps to one face, never an empty target', () => {
    expect(faceStackHitBox({ count: 0, faceSize: 51, stackStepX: 28, stackStepY: 3 })).toEqual({
      width: 51,
      height: 51,
    });
  });
});

describe('v249 — the face target and the toggle state machine', () => {
  it('the face Pressable rides above the verse row (zIndex 30) with hit slop, outside the region ScrollView', () => {
    expect(bubblesSrc).toContain("faceHit: { position: 'absolute', zIndex: 30 }");
    expect(bubblesSrc).toContain('hitSlop={6}');
    expect(bubblesSrc).toContain('accessibilityLabel="Open the notes on these verses"');
    // It is rendered before the region ScrollView in the layer, as a
    // sibling — not buried inside the scrolling region.
    const face = bubblesSrc.indexOf('styles.faceHit');
    const region = bubblesSrc.indexOf('<ReAnimated.ScrollView');
    expect(face).toBeGreaterThan(-1);
    expect(face).toBeLessThan(region);
  });

  it('no toggle anywhere flips from current state — the mid-bloom race is designed out', () => {
    expect(bubblesSrc).not.toContain('onToggle(!open)');
    expect(bubblesSrc).not.toContain('!open)');
    expect(bubblesSrc).toContain('const requestToggle = (next: boolean) => props.onToggle(next);');
    // The animation drive still dedupes on the last applied intent:
    // a repeated set to the same state restarts nothing.
    expect(bubblesSrc).toContain('last.open === open && last.progresses === progresses');
    // The bloom spec itself is untouched: same timing in, same
    // withTiming drive out, no springs.
    expect(bubblesSrc).not.toContain('withSpring');
    expect(bubblesSrc).toContain('p.value = withDelay(i * STAGGER_MS, withTiming(1, cfg));');
  });

  it('rendered closed: the face target is up, no blur anywhere', () => {
    const html = renderLayer(false);
    expect(html).toContain('Open the notes on these verses');
    expect(html).not.toContain('data-blurview');
    // (The target's box itself is pinned by the faceStackHitBox
    // numbers above and the faceHit source wiring; RNW serializes
    // styles as atomic classes, so the px box is not read off the
    // HTML string here.)
  });
});
