/**
 * v542 (briefed as v539) — the render's progress, seated in
 * the v541 variant box: while a video renders, the working
 * box's sub-line carries the percentage the native maker
 * reports (frames done of the whole) — the number only, in
 * the standing sub-line dress — and the standing sub-line
 * returns when the share lands. (The brief seated this on
 * the v536 chip's label; v541 rebuilt the seat as Concept 2
 * "Kind first" before this build landed, so the number moved
 * to the variant box's working state, spinner seat and all
 * else untouched.)
 *
 * The rig is v541's own: a gated fake maker that reports
 * (1350, 2700) — exactly halfway — then holds, so the box
 * can be read mid-render.
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
  setDevotionalShareDepsForTests,
  type DevotionalShareDeps,
} from '../devotional-share';
import { DevotionalShareGroup } from '../../components/devotional-share';

const james1 = getDevotional('James', 1) as Devotional;

const calls = {
  shareFile: [] as Array<{ uri: string; mimeType: string }>,
};
const madeFiles = new Set<string>();
let releaseVideo: (() => void) | null = null;

function installDeps() {
  const deps: DevotionalShareDeps = {
    cacheDirectory: () => 'file:///cache/',
    ensureDirectory: async () => {},
    fileExists: async (uri: string) => madeFiles.has(uri),
    localAudioUri: () => 'file:///docs/devotionals/devotional-james-1.m4a',
    nativeMaker: {
      renderCardPng: async (spec) => {
        madeFiles.add(`file://${spec.outPath}`);
      },
      renderVideo: async (spec, onProgress) => {
        // Halfway through the frames, then the gate: the
        // render is in flight with its number reported.
        onProgress?.(1350, 2700);
        await new Promise<void>((resolve) => {
          releaseVideo = resolve;
        });
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

function byLabel(root: ReactTestRenderer, label: string) {
  const found = root.root
    .findAllByType(Pressable as any)
    .find((b) => b.props.accessibilityLabel === label);
  if (!found) throw new Error(`no pressable labelled ${label}`);
  return found;
}

function allText(root: ReactTestRenderer): string[] {
  return root.root
    .findAllByType(Text as any)
    .map((t) => (Array.isArray(t.props.children) ? t.props.children.join('') : String(t.props.children ?? '')));
}

beforeEach(() => {
  calls.shareFile.length = 0;
  madeFiles.clear();
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

describe('the working variant box’s percentage', () => {
  it('the sub-line carries the render’s percentage while it works, its own line after', async () => {
    const root = render();
    act(() => {
      byLabel(root, 'Video').props.onPress();
    });
    let pending: Promise<void> | undefined;
    act(() => {
      pending = byLabel(root, 'Share Story video').props.onPress();
    });
    // Flush the flow up to the gated maker: the render has
    // reported its halfway mark and is holding there.
    await act(async () => {});
    const mid = allText(root);
    expect(mid).toContain('50%');
    // The number stands in the WORKING box's sub-line seat:
    // its standing line is displaced, the other box's is not.
    expect(mid).not.toContain('Full screen');
    expect(mid).toContain('Feed post');
    expect(byLabel(root, 'Share Story video').props.accessibilityState.busy).toBe(true);
    expect(calls.shareFile).toHaveLength(0);
    // Let it land: the sheet opens with the video, and the
    // box wears its standing sub-line again, number gone.
    await act(async () => {
      releaseVideo?.();
      await pending;
    });
    expect(calls.shareFile).toEqual([
      {
        uri: 'file:///cache/devotional-share/prayercircle-james-1-story-video.mp4',
        mimeType: 'video/mp4',
      },
    ]);
    const after = allText(root);
    expect(after).toContain('Full screen');
    expect(after).not.toContain('50%');
  });
});
