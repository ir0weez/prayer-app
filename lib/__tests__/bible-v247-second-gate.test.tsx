/**
 * v247 — the second gate: LAYOUT COLLAPSE. Jonathan, Oct 25, 12:03
 * PDT, on v246: "you still didn't fix the freaking Bible!!!" His
 * screenshots (10668/10667, Paper × Sunset, light) are ~98% the
 * bare navigator gray (242,242,242); the Paper cream the Bible
 * root paints appears NOWHERE. What paints: the topbar's pill
 * border, the progress track/fill, borders compressed to
 * padding-only heights — and no glyphs, anywhere.
 *
 * Why (full write-up: hidden_files/blank-bible-diagnosis.md, the
 * Oct 25 v247 addendum): v246 removed a REAL first gate — the
 * whole-screen opacity-0 fade. Behind it stood this one. All four
 * Bible surfaces wrap a bare `<View style={{flex:1}}>` content
 * root in PaperSettle/BitSettle with NO style prop. The wrapper
 * had no flex and no size, so its height was auto; Yoga resolves
 * an auto-height parent from its child's hypothetical main size,
 * and a flex:1 child's basis is 0 — so the wrapper laid out at
 * height 0, the content root was laid out at height 0 inside it,
 * its background painted nowhere, and the ScrollView clipped
 * everything. Classic/Terminal return the root bare into the
 * screen container (definite size), which is why defaulting his
 * appearance "cured" it, and why only the Bible was blank: these
 * are the app's ONLY whole-screen settle wraps of a bare flex:1
 * root; everywhere else the kits wrap content-sized cards.
 *
 * The fix: in both kits, a screenRoot wrapper's style leads with
 * `{ flex: 1 }` — the wrapper takes the screen's size, giving the
 * flex:1 child a definite parent to fill. Card-level settles
 * (screenRoot false) are byte-for-byte the old behavior.
 *
 * Harness limit, stated plainly: the web renderer cannot
 * reproduce the collapse (CSS flex sizes a flex:1 child by
 * content against an indefinite parent; Yoga uses basis 0).
 * What these pins CAN hold is the contract that kills it on
 * device: a screenRoot wrapper's RESOLVED style carries flex:1,
 * a card settle's does not, and the wiring in both kits keeps
 * the flex ahead of the caller's style in the array.
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const rig = vi.hoisted(() => ({ skin: 'paper' as string }));

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');
  const { View, Text, ScrollView } = await import('react-native-web');
  const AV = (props: any) => React.createElement(View, props, props?.children);
  return {
    __esModule: true,
    default: { View: AV, Text, ScrollView, createAnimatedComponent: (c: any) => c },
    View: AV,
    useSharedValue: (v: any) => ({ value: v }),
    useAnimatedStyle: (fn: any) => fn(),
    withTiming: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    Easing: { steps: () => ({}), bezier: () => ({}) },
  };
});

vi.mock('@/hooks/use-skin', async () => {
  const { getThemedPalette } = await import('../color-themes');
  const { getSkinTokens } = await import('../skin-themes');
  return {
    useSkin: () => {
      const colors: any = getThemedPalette('light', 'default' as any);
      const tokens: any = getSkinTokens(rig.skin as any, 'light', colors);
      return {
        skin: rig.skin,
        isPaper: tokens.isPaper,
        isEightBit: tokens.isEightBit,
        isTerminal: tokens.isTerminal,
        tokens,
        motion: {
          settle: { duration: tokens.motion.settleDuration, easing: {} },
          settleDistance: tokens.motion.settleDistance,
        },
      };
    },
  };
});

import { PaperSettle } from '../../components/paper-motion';
import { BitSettle } from '../../components/bit-motion';
import { View, Text } from 'react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (rel: string) => readFileSync(join(process.cwd(), rel), 'utf8');

/** A Bible surface's shape: a bare flex:1 content root. */
const bareRoot = () =>
  React.createElement(View, { style: { flex: 1 } }, React.createElement(Text, null, 'verse'));

/** The style of the FIRST element — the settle wrapper itself. */
function wrapperStyle(html: string): string {
  const m = html.match(/<div[^>]*style="([^"]*)"/);
  return m ? m[1] : '';
}

describe('v247 — screenRoot wrappers carry flex:1 (the second gate)', () => {
  it('PaperSettle screenRoot: resolved wrapper style includes flex:1, opacity pinned 1', () => {
    rig.skin = 'paper';
    const html = renderToString(React.createElement(PaperSettle, { screenRoot: true }, bareRoot()));
    const style = wrapperStyle(html);
    expect(style, 'paper screenRoot wrapper style').toContain('flex:1');
    expect(style, 'paper screenRoot keeps the v246 opacity pin').toContain('opacity:1');
    expect(html).toContain('verse');
  });

  it('BitSettle screenRoot: resolved wrapper style includes flex:1, opacity pinned 1', () => {
    rig.skin = '8bit';
    const html = renderToString(React.createElement(BitSettle, { screenRoot: true }, bareRoot()));
    const style = wrapperStyle(html);
    expect(style, '8-bit screenRoot wrapper style').toContain('flex:1');
    expect(style, '8-bit screenRoot keeps the v246 opacity pin').toContain('opacity:1');
    expect(html).toContain('verse');
  });
});

describe('v247 — card-level settles do NOT gain flex (regression)', () => {
  it('PaperSettle without screenRoot: no flex on the wrapper, fade entrance unchanged', () => {
    rig.skin = 'paper';
    const html = renderToString(React.createElement(PaperSettle, {}, bareRoot()));
    const style = wrapperStyle(html);
    expect(style, 'paper card wrapper must not gain flex').not.toMatch(/flex/);
    expect(style, 'paper card keeps its v202 fade-in entrance').toContain('opacity:0');
  });

  it('BitSettle without screenRoot: no flex on the wrapper, snap entrance unchanged', () => {
    rig.skin = '8bit';
    const html = renderToString(React.createElement(BitSettle, {}, bareRoot()));
    const style = wrapperStyle(html);
    expect(style, '8-bit card wrapper must not gain flex').not.toMatch(/flex/);
    expect(style, '8-bit card keeps its v203 snap-in entrance').toContain('opacity:0');
  });
});

describe('v247 — wiring: the flex leads the wrapper style in both kits', () => {
  it('both settle kits put screenRoot ? { flex: 1 } : null ahead of style + animatedStyle', () => {
    for (const f of ['components/paper-motion.tsx', 'components/bit-motion.tsx']) {
      const src = read(f);
      expect(src, `${f} screenRoot flex wiring`).toContain(
        'style={[screenRoot ? { flex: 1 } : null, style, animatedStyle]}',
      );
    }
  });
});
