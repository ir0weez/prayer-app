/**
 * v541 — the Share group's seat, rebuilt as Concept 2 "Kind
 * first" (mockup player-share-cleanup-v1; Jonathan's pick,
 * Nov 15: "Just use concept 2 from here").
 *
 *   · The model: three segments in the drawing's order
 *     (Audio | Card | Video); Audio is an immediate action
 *     with NO variants; Card maps to the two still kinds,
 *     Video to the two video kinds; the group opens on Card;
 *     a variant box carries the shape's name and the drawing's
 *     sub-line (Square → "Feed post", Story → "Full screen").
 *   · The component: the bar and the picked kind's two boxes
 *     stand under the SHARE heading; a variant tap invokes the
 *     same generation entry points the v536 chips used
 *     (renderCardPng / renderVideo through the share flow,
 *     then the sheet); switching kinds while a render runs
 *     does not cancel it — the sheet still opens when it
 *     lands.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('react-native-svg', async () => {
  const React = await import('react');
  const host = (name: string) => (props: any) => React.createElement(name, props, props?.children);
  return {
    default: host('svg'),
    Circle: host('circle'),
    Path: host('path'),
    Rect: host('rect'),
  };
});

import { Pressable, Text } from 'react-native';
import { getDevotional, type Devotional } from '../devotionals';
import {
  DEVOTIONAL_SHARE_DEFAULT_KIND,
  DEVOTIONAL_SHARE_GROUP_SEGMENTS,
  setDevotionalShareDepsForTests,
  shareGroupVariants,
  shareVariantName,
  shareVariantSubLabel,
  type DevotionalShareDeps,
} from '../devotional-share';
import { DevotionalShareGroup } from '../../components/devotional-share';

const james1 = getDevotional('James', 1) as Devotional;

const calls = {
  renderCardPng: [] as unknown[],
  renderVideo: [] as unknown[],
  shareFile: [] as Array<{ uri: string; mimeType: string }>,
};
let audioUri: string | null = 'file:///docs/devotionals/devotional-james-1.m4a';
let gateVideo = false;
let releaseVideo: (() => void) | null = null;
const madeFiles = new Set<string>();

function installDeps() {
  const deps: DevotionalShareDeps = {
    cacheDirectory: () => 'file:///cache/',
    ensureDirectory: async () => {},
    fileExists: async (uri: string) => madeFiles.has(uri),
    localAudioUri: () => audioUri,
    nativeMaker: {
      renderCardPng: async (spec) => {
        calls.renderCardPng.push(spec);
        madeFiles.add(`file://${spec.outPath}`);
      },
      renderVideo: async (spec) => {
        calls.renderVideo.push(spec);
        if (gateVideo) {
          await new Promise<void>((resolve) => {
            releaseVideo = resolve;
          });
        }
        madeFiles.add(`file://${spec.outPath}`);
      },
    },
    shareFile: async (uri: string, mimeType: string) => {
      calls.shareFile.push({ uri, mimeType });
    },
  };
  setDevotionalShareDepsForTests(deps);
}

let renderer: ReactTestRenderer | null = null;

function render() {
  act(() => {
    renderer = TestRenderer.create(
      <DevotionalShareGroup
        devotional={james1}
        primary="#4A148C"
        accent="#4A148C"
        stopSeat="#DEC3F0"
        panel="#EDDEF5"
        track="#C9A6E0"
        ink="#2E0A4A"
        inkSoft="#854B47"
      />,
    );
  });
  return renderer as ReactTestRenderer;
}

function pressables(root: ReactTestRenderer) {
  return root.root.findAllByType(Pressable as any);
}

function byLabel(root: ReactTestRenderer, label: string) {
  const found = pressables(root).find((b) => b.props.accessibilityLabel === label);
  if (!found) throw new Error(`no pressable labelled ${label}`);
  return found;
}

function labels(root: ReactTestRenderer): string[] {
  return pressables(root).map((b) => String(b.props.accessibilityLabel));
}

function allText(root: ReactTestRenderer): string[] {
  return root.root
    .findAllByType(Text as any)
    .map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children ?? '')));
}

beforeEach(() => {
  calls.renderCardPng.length = 0;
  calls.renderVideo.length = 0;
  calls.shareFile.length = 0;
  madeFiles.clear();
  audioUri = 'file:///docs/devotionals/devotional-james-1.m4a';
  gateVideo = false;
  releaseVideo = null;
  installDeps();
});

afterEach(() => {
  if (renderer) {
    act(() => {
      renderer?.unmount();
    });
    renderer = null;
  }
  setDevotionalShareDepsForTests(null);
});

describe('the kind → variant model', () => {
  it('the bar carries three segments in the drawing’s order', () => {
    expect(DEVOTIONAL_SHARE_GROUP_SEGMENTS).toEqual([
      { kind: 'audio', label: 'Audio' },
      { kind: 'card', label: 'Card' },
      { kind: 'video', label: 'Video' },
    ]);
  });

  it('Audio is an action: it maps to no variants', () => {
    expect(shareGroupVariants('audio')).toEqual([]);
  });

  it('Card maps to the two still kinds, Video to the two video kinds', () => {
    expect(shareGroupVariants('card')).toEqual(['square-card', 'story-card']);
    expect(shareGroupVariants('video')).toEqual(['square-video', 'story-video']);
  });

  it('the group opens on Card', () => {
    expect(DEVOTIONAL_SHARE_DEFAULT_KIND).toBe('card');
  });

  it('a variant box names the shape and carries the drawing’s sub-line', () => {
    expect(shareVariantName('square-card')).toBe('Square');
    expect(shareVariantName('story-video')).toBe('Story');
    expect(shareVariantSubLabel('square-video')).toBe('Feed post');
    expect(shareVariantSubLabel('story-card')).toBe('Full screen');
    // The audio share has no variant box, so no name, no sub-line.
    expect(shareVariantName('audio')).toBeNull();
    expect(shareVariantSubLabel('audio')).toBeNull();
  });
});

describe('the seat as drawn', () => {
  it('opens on Card: its two still boxes stand under the bar', () => {
    const root = render();
    expect(labels(root)).toEqual([
      'Share Audio',
      'Card',
      'Video',
      'Share Square card',
      'Share Story card',
    ]);
    expect(byLabel(root, 'Card').props.accessibilityState.selected).toBe(true);
    expect(byLabel(root, 'Video').props.accessibilityState.selected).toBe(false);
    const text = allText(root);
    expect(text).toContain('SHARE');
    expect(text).toContain('Square');
    expect(text).toContain('Feed post');
    expect(text).toContain('Story');
    expect(text).toContain('Full screen');
  });

  it('the Video segment trades the boxes for the two video kinds', () => {
    const root = render();
    act(() => {
      byLabel(root, 'Video').props.onPress();
    });
    expect(labels(root)).toEqual([
      'Share Audio',
      'Card',
      'Video',
      'Share Square video',
      'Share Story video',
    ]);
    expect(byLabel(root, 'Video').props.accessibilityState.selected).toBe(true);
    expect(byLabel(root, 'Card').props.accessibilityState.selected).toBe(false);
    // And back.
    act(() => {
      byLabel(root, 'Card').props.onPress();
    });
    expect(labels(root)).toContain('Share Square card');
  });
});

describe('the shares themselves — the chips’ own doors', () => {
  it('a card variant tap generates through renderCardPng and opens the sheet', async () => {
    const root = render();
    await act(async () => {
      byLabel(root, 'Share Square card').props.onPress();
    });
    expect(calls.renderCardPng).toHaveLength(1);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toEqual([
      {
        // RE-BASE (v547): the shared name carries the painter
        // revision (-r2); the door claim stands.
        // RE-BASE (v548, 2026-11-17): the painter revision moved to 3 (the bar's end dot became a tick) — the name carries -r3 now; the claim is unchanged.
        uri: 'file:///cache/devotional-share/prayercircle-james-1-square-card-r3.png',
        mimeType: 'image/png',
      },
    ]);
  });

  it('a video variant tap generates through renderVideo and opens the sheet', async () => {
    const root = render();
    act(() => {
      byLabel(root, 'Video').props.onPress();
    });
    await act(async () => {
      byLabel(root, 'Share Story video').props.onPress();
    });
    expect(calls.renderVideo).toHaveLength(1);
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.shareFile).toEqual([
      {
        // RE-BASE (v547): the shared name carries the painter
        // revision (-r2); the door claim stands.
        // RE-BASE (v548, 2026-11-17): the painter revision moved to 3 (the bar's end dot became a tick) — the name carries -r3 now; the claim is unchanged.
        uri: 'file:///cache/devotional-share/prayercircle-james-1-story-video-r3.mp4',
        mimeType: 'video/mp4',
      },
    ]);
  });

  it('the Audio segment shares the file itself at a tap and generates nothing', async () => {
    const root = render();
    await act(async () => {
      byLabel(root, 'Share Audio').props.onPress();
    });
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toEqual([
      { uri: 'file:///docs/devotionals/devotional-james-1.m4a', mimeType: 'audio/mp4' },
    ]);
    // Sharing audio selects nothing: the Card boxes still stand.
    expect(labels(root)).toContain('Share Square card');
  });

  it('the Audio segment is disabled while the file is not on the phone', () => {
    audioUri = null;
    installDeps();
    const root = render();
    expect(byLabel(root, 'Share Audio').props.disabled).toBe(true);
    // The generated four stand — they are made from the model.
    expect(byLabel(root, 'Share Square card').props.disabled).toBe(false);
  });
});

describe('a render in flight', () => {
  it('the working box carries the busy state, and switching kinds does not cancel the render', async () => {
    gateVideo = true;
    installDeps();
    const root = render();
    act(() => {
      byLabel(root, 'Video').props.onPress();
    });
    // Start the Story video render; it parks at the gate.
    let pending: Promise<void> | undefined;
    act(() => {
      pending = byLabel(root, 'Share Story video').props.onPress();
    });
    // Flush the flow (disk check, directory) up to the maker.
    await act(async () => {});
    expect(calls.renderVideo).toHaveLength(1);
    expect(byLabel(root, 'Share Story video').props.accessibilityState.busy).toBe(true);
    // Switch kinds mid-render: the Card boxes stand, disabled
    // while the group is busy — and the render runs on.
    act(() => {
      byLabel(root, 'Card').props.onPress();
    });
    expect(labels(root)).toContain('Share Square card');
    expect(byLabel(root, 'Share Square card').props.disabled).toBe(true);
    expect(calls.shareFile).toHaveLength(0);
    // Let it land: the sheet still opens, with the video.
    await act(async () => {
      releaseVideo?.();
      await pending;
    });
    expect(calls.shareFile).toEqual([
      {
        // RE-BASE (v547): the shared name carries the painter
        // revision (-r2); the mid-render claim stands.
        // RE-BASE (v548, 2026-11-17): the painter revision moved to 3 (the bar's end dot became a tick) — the name carries -r3 now; the claim is unchanged.
        uri: 'file:///cache/devotional-share/prayercircle-james-1-story-video-r3.mp4',
        mimeType: 'video/mp4',
      },
    ]);
  });
});
