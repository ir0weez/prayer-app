/**
 * v507 — Ten Stops indicator: the route strip + the shared door.
 *
 * Pins the strip's render at the drawing's measure (components/
 * ten-stops-indicator.tsx): ten numbered dots on a line in the
 * book's family — behind = mid-tone fill, this chapter's stop =
 * solid primary and larger, ahead = white with the derived
 * numeral; a segment is filled exactly when the stop at its left
 * is behind the reader (the rule both of the blend drawing's
 * phones follow); the captions are the drawing's words. And the
 * door behind every disc (openTenStopsAtStop): downloaded → the
 * player opens the tour and seeks to the stop's transcript
 * second; not downloaded → false, and the player is never
 * touched (the caller routes to the book page's Ten Stops card).
 *
 * The render rig is the v505 rig's mock set (string components +
 * react-test-renderer), unchanged in kind.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const player = vi.hoisted(() => ({
  openDevotional: vi.fn(() => true),
  seekDevotional: vi.fn(),
}));

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    hairlineWidth: 0.5,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
  Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
}));

// The door's lazy require (the v501 pattern — the controller
// must not load with the surface) is a real Node require at
// runtime, which vitest's import mocks cannot intercept; the
// module loader itself is patched for exactly that one path, for
// this file only, so the spies above are what the door receives.
import Module from 'module';
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, ...rest: any[]) {
  if (request.endsWith('lib/devotional-player')) {
    return { openDevotional: player.openDevotional, seekDevotional: player.seekDevotional };
  }
  return origLoad.call(this, request, ...rest);
};

import { TenStopsRouteStrip, openTenStopsAtStop } from '../../components/ten-stops-indicator';
import { getTenStops } from '../ten-stops';
import { tenStopMarks } from '../ten-stops-indicator';
import {
  refreshTenStopsDownload,
  resetTenStopsDownloadsForTests,
  setTenStopsFileSystemForTests,
  type TenStopsFileSystem,
} from '../ten-stops-download';

const HEBREWS = getTenStops('Hebrews')!;
const MARKS = tenStopMarks(HEBREWS);

/** Hebrews' violet family at the palette's own fields (light). */
const VIOLET_PAL = {
  rasp: '#7B1FA2',
  raspDeep: '#4A148C',
  raspTint: '#EDDEF5',
  paper2: '#FFFEF9',
} as any;

const flat = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flat));
  return (style as Record<string, unknown>) ?? {};
};

function renderStrip(chapter: number, onStopPress = vi.fn()) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <TenStopsRouteStrip entry={HEBREWS} chapter={chapter} palette={VIOLET_PAL} onStopPress={onStopPress} />,
    );
  });
  return renderer.root;
}

const byTestID = (root: ReactTestInstance, id: string) =>
  root.findAll((n) => n.props?.testID === id);

const dot = (root: ReactTestInstance, stop: number) =>
  byTestID(root, `ten-stop-route-dot-${stop}`)[0];

const allText = (root: ReactTestInstance): string[] =>
  root.findAllByType('Text' as any).map((t) => {
    const kids = t.props.children;
    return Array.isArray(kids) ? kids.join('') : String(kids ?? '');
  });

// ─── The strip's render ─────────────────────────────────────────────────────

describe('v507 surfaces — the route strip (Hebrews 9, Stop 6’s chapter)', () => {
  it('renders ten dots: five done in the mid tone, Stop 6 standing in the solid primary, the rest waiting white', () => {
    const root = renderStrip(9);
    for (let s = 1; s <= 10; s++) {
      const style = flat(dot(root, s).props.style);
      if (s < 6) {
        expect(style.backgroundColor, `dot ${s}`).toBe('#BA8BCF');
        expect(style.borderColor, `dot ${s}`).toBe('#BA8BCF');
        expect(style.width).toBe(19);
      } else if (s === 6) {
        expect(style.backgroundColor).toBe('#7B1FA2');
        expect(style.borderColor).toBe('#7B1FA2');
        expect(style.width).toBe(23);
      } else {
        expect(style.backgroundColor, `dot ${s}`).toBe('#FFFEF9');
        expect(style.borderColor, `dot ${s}`).toBe('#BA8BCF');
        expect(style.width).toBe(19);
      }
    }
    // The panel wears the book's tintA.
    const panel = byTestID(root, 'ten-stops-route-strip')[0];
    expect(flat(panel.props.style).backgroundColor).toBe('#EDDEF5');
  });

  it('segments fill exactly behind the reader: five travelled, four waiting', () => {
    const root = renderStrip(9);
    const segs = root
      .findAllByType('View' as any)
      .filter((v) => flat(v.props.style).height === 2.5)
      .map((v) => flat(v.props.style).backgroundColor);
    expect(segs).toEqual([
      '#BA8BCF', '#BA8BCF', '#BA8BCF', '#BA8BCF', '#BA8BCF',
      '#DAC0E5', '#DAC0E5', '#DAC0E5', '#DAC0E5',
    ]);
  });

  it('captions: “5 stops behind you” and this chapter’s stop named', () => {
    const texts = allText(renderStrip(9));
    expect(texts).toContain('5 stops behind you');
    expect(texts).toContain('STOP 6 · 9:15–22');
  });

  it('every dot carries its STOP number — dot 6 on chapter 9’s strip is Stop 6, and the numerals are the stops 1–10', () => {
    const root = renderStrip(9);
    for (let s = 1; s <= 10; s++) {
      const num = dot(root, s).findByType('Text' as any);
      expect(String(num.props.children)).toBe(String(s));
    }
  });
});

describe('v507 surfaces — the route strip on a chapter with no stop (Hebrews 7)', () => {
  it('no dot stands as “now”, no right caption, four stops behind', () => {
    const root = renderStrip(7);
    for (let s = 1; s <= 10; s++) {
      expect(flat(dot(root, s).props.style).backgroundColor).not.toBe('#7B1FA2');
    }
    expect(byTestID(root, 'ten-stop-route-here')).toHaveLength(0);
    expect(allText(root)).toContain('4 stops behind you');
  });
});

describe('v507 surfaces — an untoured book renders no strip at all', () => {
  it('entry null → nothing', () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <TenStopsRouteStrip entry={null} chapter={1} palette={VIOLET_PAL} onStopPress={vi.fn()} />,
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });
});

// ─── The door ───────────────────────────────────────────────────────────────

describe('v507 surfaces — dot taps hand the stop to the caller', () => {
  it('pressing dot 7 reports Stop 7 with its transcript second (690.3)', () => {
    const onStopPress = vi.fn();
    const root = renderStrip(9, onStopPress);
    act(() => {
      dot(root, 7).props.onPress();
    });
    expect(onStopPress).toHaveBeenCalledTimes(1);
    expect(onStopPress.mock.calls[0][0]).toMatchObject({ stop: 7, title: 'Hold Fast to Jesus', startSec: 690.3 });
  });
});

// ─── openTenStopsAtStop: the shared door's two halves ───────────────────────

function makeFakeFileSystem() {
  const files = new Map<string, number>();
  const fs: TenStopsFileSystem = {
    documentDirectory: 'file:///docs/',
    getInfoAsync: async (path: string) =>
      files.has(path) ? { exists: true, size: files.get(path) } : { exists: false },
    makeDirectoryAsync: async () => undefined,
    deleteAsync: async (path: string) => {
      files.delete(path);
    },
    createDownloadResumable: () => {
      throw new Error('no downloads in the door tests');
    },
  };
  return { fs, files };
}

let fake = makeFakeFileSystem();

beforeEach(() => {
  fake = makeFakeFileSystem();
  resetTenStopsDownloadsForTests();
  setTenStopsFileSystemForTests(fake.fs);
  player.openDevotional.mockClear();
  player.seekDevotional.mockClear();
});

describe('v507 surfaces — openTenStopsAtStop', () => {
  it('not downloaded → false, and the player is never touched', () => {
    expect(openTenStopsAtStop(HEBREWS, MARKS[5])).toBe(false);
    expect(player.openDevotional).not.toHaveBeenCalled();
    expect(player.seekDevotional).not.toHaveBeenCalled();
  });

  it('downloaded → the tour session opens and seeks to the stop’s second', async () => {
    fake.files.set('file:///docs/ten-stops/hebrews-ten-stops.m4a', HEBREWS.sizeBytes);
    await refreshTenStopsDownload(HEBREWS);
    expect(openTenStopsAtStop(HEBREWS, MARKS[5])).toBe(true);
    expect(player.openDevotional).toHaveBeenCalledTimes(1);
    const [devotional, source] = player.openDevotional.mock.calls[0] as any[];
    expect(devotional).toMatchObject({ book: 'Hebrews', chapter: 0, bookLevel: true });
    expect(devotional.movements).toHaveLength(10);
    expect(source).toEqual({ uri: 'file:///docs/ten-stops/hebrews-ten-stops.m4a' });
    expect(player.seekDevotional).toHaveBeenCalledWith(605.8);
  });

  it('a wrong-size file on disk does not count as downloaded', async () => {
    fake.files.set('file:///docs/ten-stops/hebrews-ten-stops.m4a', HEBREWS.sizeBytes - 1);
    await refreshTenStopsDownload(HEBREWS);
    expect(openTenStopsAtStop(HEBREWS, MARKS[0])).toBe(false);
    expect(player.openDevotional).not.toHaveBeenCalled();
  });
});
