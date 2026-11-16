/**
 * v536 — the Share group's seat, pinned at the component and at
 * its mount in the listen view.
 *
 *   · Five quiet tonal buttons stand in the group, in the
 *     model's order, wearing the page's own chip dress (the
 *     Stop/Transcript seat and accent).
 *   · The group exists for CHAPTER devotional sessions only:
 *     the listen view mounts it behind !devotional.bookLevel,
 *     so a Ten Stops tour session never renders it (pinned at
 *     the mount's source, the way the tour-only and chapter-only
 *     doors are pinned elsewhere in this suite).
 *   · The Audio button stands only while the chapter's file is
 *     on the phone; without it, it is disabled — it never offers
 *     a share of a file that is not there.
 *   · A tap generates (through the share flow's doors, faked
 *     here) and opens the sheet; while a generation runs the
 *     group is busy; a failure lands as the group's error line
 *     and nothing is shared.
 *
 * v541 RE-BASE (2026-11-15): the seat changed — the five chips
 * became Concept 2 "Kind first" (a segmented Audio | Card |
 * Video bar over the picked kind's two variant boxes; pinned
 * in devotional-share-v541.test.tsx). The behaviour claims
 * below are UNCHANGED — the Audio door's disk rule, a tap
 * generating into the cache and opening the sheet, the busy
 * group, the error line, the chapter-only mount — only the
 * layout assertions moved to the new seat: the group opens on
 * Card (Audio segment + Card/Video segments + the two still
 * boxes), and the video kinds stand behind the Video segment.
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
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
  renderCardPng: [] as unknown[],
  renderVideo: [] as unknown[],
  shareFile: [] as Array<{ uri: string; mimeType: string }>,
};
let audioUri: string | null = 'file:///docs/devotionals/devotional-james-1.m4a';
let makerFails = false;
const madeFiles = new Set<string>();

function installDeps() {
  const deps: DevotionalShareDeps = {
    cacheDirectory: () => 'file:///cache/',
    ensureDirectory: async () => {},
    fileExists: async (uri: string) => madeFiles.has(uri),
    localAudioUri: () => audioUri,
    nativeMaker: {
      renderCardPng: async (spec) => {
        if (makerFails) throw new Error('the maker refused');
        calls.renderCardPng.push(spec);
        madeFiles.add(`file://${spec.outPath}`);
      },
      renderVideo: async (spec) => {
        if (makerFails) throw new Error('the maker refused');
        calls.renderVideo.push(spec);
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

function buttons(root: ReactTestRenderer) {
  return root.root.findAllByType(Pressable as any);
}

function buttonByLabel(root: ReactTestRenderer, label: string) {
  const found = buttons(root).find((b) => b.props.accessibilityLabel === `Share ${label}`);
  if (!found) throw new Error(`no Share button labelled ${label}`);
  return found;
}

function segmentByLabel(root: ReactTestRenderer, label: string) {
  const found = buttons(root).find((b) => b.props.accessibilityLabel === label);
  if (!found) throw new Error(`no segment labelled ${label}`);
  return found;
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
  makerFails = false;
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

describe('the seat', () => {
  it('stands the segmented bar and the opening kind’s two boxes under a SHARE heading (v541 seat)', () => {
    const root = render();
    const labels = buttons(root).map((b) => b.props.accessibilityLabel);
    // The group opens on Card: the Audio segment, the two kind
    // segments, then Card's two variant boxes. The video kinds
    // stand behind the Video segment.
    expect(labels).toEqual([
      'Share Audio',
      'Card',
      'Video',
      'Share Square card',
      'Share Story card',
    ]);
    expect(allText(root)).toContain('SHARE');
    expect(allText(root)).toContain('Square');
    act(() => {
      segmentByLabel(root, 'Video').props.onPress();
    });
    expect(buttons(root).map((b) => b.props.accessibilityLabel)).toEqual([
      'Share Audio',
      'Card',
      'Video',
      'Share Square video',
      'Share Story video',
    ]);
  });

  it('the Audio button is disabled while the file is not on the phone', () => {
    audioUri = null;
    installDeps();
    const root = render();
    expect(buttonByLabel(root, 'Audio').props.disabled).toBe(true);
    // The other four stand — they generate from the model.
    expect(buttonByLabel(root, 'Square card').props.disabled).toBe(false);
  });

  it('a card tap generates into the cache and opens the sheet', async () => {
    const root = render();
    await act(async () => {
      buttonByLabel(root, 'Square card').props.onPress();
    });
    expect(calls.renderCardPng).toHaveLength(1);
    expect(calls.shareFile).toEqual([
      {
        // RE-BASE (v547): the shared name carries the painter
        // revision (-r2); the generate-then-share claim stands.
        uri: 'file:///cache/devotional-share/prayercircle-james-1-square-card-r2.png',
        mimeType: 'image/png',
      },
    ]);
  });

  it('an audio tap shares the file itself and generates nothing', async () => {
    const root = render();
    await act(async () => {
      buttonByLabel(root, 'Audio').props.onPress();
    });
    expect(calls.renderCardPng).toHaveLength(0);
    expect(calls.renderVideo).toHaveLength(0);
    expect(calls.shareFile).toEqual([
      { uri: 'file:///docs/devotionals/devotional-james-1.m4a', mimeType: 'audio/mp4' },
    ]);
  });

  it('a failed generation lands as the error line, and nothing is shared', async () => {
    makerFails = true;
    installDeps();
    const root = render();
    act(() => {
      segmentByLabel(root, 'Video').props.onPress();
    });
    await act(async () => {
      buttonByLabel(root, 'Story video').props.onPress();
    });
    expect(calls.shareFile).toHaveLength(0);
    expect(allText(root)).toContain('the maker refused');
    // The group is usable again after the failure.
    expect(buttonByLabel(root, 'Story video').props.disabled).toBe(false);
  });
});

describe('the mount — chapter sessions only', () => {
  it('the listen view mounts the group behind the chapter gate', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'components', 'devotional-listen.tsx'),
      'utf8',
    );
    const mountAt = source.indexOf('<DevotionalShareGroup');
    expect(mountAt).toBeGreaterThan(0);
    const gateText = '{!devotional.bookLevel ? (';
    const gateAt = source.lastIndexOf(gateText, mountAt);
    expect(gateAt).toBeGreaterThan(0);
    // The gate is the mount's own condition, not a distant one:
    // nothing but the group's props sits between them.
    const between = source.slice(gateAt + gateText.length, mountAt);
    expect(between).not.toContain('? (');
    expect(between).not.toContain('&&');
    // And it stands in the scroll column under the controls row.
    const controlsAt = source.indexOf('<ControlsRow');
    expect(gateAt).toBeGreaterThan(controlsAt);
  });
});
