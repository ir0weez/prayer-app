// ─── v535 — delete a devotional from the chapter page ────────
// The picked design (chapter-delete-devotional-v3.html, "The
// pill becomes the question"): hold the chapter page's
// Devotional pill while the chapter is on the phone and the
// pill stretches in its own seat into Remove / Keep; Remove
// deletes the local file only; Keep or a tap anywhere else
// folds it back unchanged.
//
// These tests drive the REAL door (components/devotional-door
// .tsx) with the v503 interactive rig (host-string react-native
// stubs + a stepping reanimated mock), against rigged download
// and player modules. Pinned:
//  - the pill's normal face is the door as it always stood
//    (play glyph on the phone, download glyph off it; the tap
//    still opens the devotional);
//  - the morph exists ONLY in the on-phone state — off the
//    phone (or mid-download) the long-press does nothing at all;
//  - the long-press stretches the seat from its measured rest
//    width to the segments' measured natural width over 250ms;
//  - Remove stops THIS chapter's live session first when it is
//    the one playing, then deletes the local file, folds back,
//    and the pill lands showing the download state; another
//    chapter's session is never stopped;
//  - Keep and the page's outside-touch signal fold back with
//    nothing deleted;
//  - the file leaving by another door folds a standing morph
//    at once;
//  - reduce motion: no stretch — the segments are simply there,
//    and the fold is instant too.
// The chapter page's half of the contract (the door seated in
// the doorway, the root touch fold, the stamp ref) and the
// palette's error role are pinned from source at the foot.
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';
import { describe, expect, it, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const rig = vi.hoisted(() => ({
  status: 'ready' as 'idle' | 'downloading' | 'ready' | 'error',
  reduceMotion: false,
  session: null as null | { devotional: { book: string; chapter: number } },
  calls: [] as string[],
  timingCalls: [] as { to: number; duration: number }[],
  animations: new Set<{ step: (ms: number) => void }>(),
  stepAll(ms: number) {
    for (const entry of [...rig.animations]) entry.step(ms);
  },
}));

vi.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  ScrollView: 'ScrollView',
  StyleSheet: { create: (styles: Record<string, unknown>) => styles },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(rig.reduceMotion),
    addEventListener: () => ({ remove: () => {} }),
  },
  Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
}));

vi.mock('react-native-reanimated', async () => {
  const React = await import('react');

  function makeSharedValue(initial: number) {
    let current = initial;
    let anim: { from: number; to: number; elapsed: number; duration: number } | null = null;
    const entry = {
      step(ms: number) {
        if (!anim) return;
        anim.elapsed += ms;
        const t = Math.min(1, anim.elapsed / anim.duration);
        current = anim.from + (anim.to - anim.from) * t;
        if (t >= 1) {
          anim = null;
          rig.animations.delete(entry);
        }
      },
    };
    const sv: Record<string, unknown> = {};
    Object.defineProperty(sv, 'value', {
      get: () => current,
      set: (v: unknown) => {
        if (v !== null && typeof v === 'object' && (v as { __timing?: boolean }).__timing === true) {
          const d = v as { to: number; duration: number };
          anim = { from: current, to: d.to, elapsed: 0, duration: d.duration };
          rig.animations.add(entry);
        } else {
          anim = null;
          rig.animations.delete(entry);
          current = v as number;
        }
      },
    });
    return sv;
  }

  return {
    __esModule: true,
    default: { View: 'View', Text: 'Text', ScrollView: 'ScrollView', createAnimatedComponent: (c: any) => c },
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    createAnimatedComponent: (c: any) => c,
    useSharedValue: (initial: number) => {
      const ref = React.useRef<unknown>(null);
      if (ref.current === null) ref.current = makeSharedValue(initial);
      return ref.current;
    },
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    useAnimatedProps: (fn: () => Record<string, unknown>) => fn(),
    withTiming: (to: number, config?: { duration?: number }) => {
      const call = { to, duration: config?.duration ?? 300 };
      rig.timingCalls.push(call);
      return { __timing: true, ...call };
    },
    Easing: { bezier: () => ({}) },
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('Text', props, `icon:${props.name}`),
  };
});

vi.mock('@/lib/devotional-download', () => ({
  useDevotionalDownloadState: () => ({ status: rig.status, fraction: 0, error: null }),
  deleteDevotionalDownload: () => {
    rig.calls.push('delete');
    return Promise.resolve();
  },
}));

// The door's player access is a lazy require (the v501 pattern —
// the controller must not load with the chapter page), which is
// a real Node require at runtime that vitest's import mocks
// cannot intercept; the module loader itself is patched for
// exactly that one path, for this file only (the v507 surfaces
// test's mechanism), so the rig above is what the door receives.
import Module from 'module';
const origLoad = (Module as any)._load;
(Module as any)._load = function (request: string, ...rest: any[]) {
  if (request.endsWith('lib/devotional-player')) {
    return {
      getDevotionalPlayerSnapshot: () => ({ devotional: rig.session?.devotional ?? null }),
      stopDevotional: () => {
        rig.calls.push('stop');
      },
    };
  }
  return origLoad.call(this, request, ...rest);
};

import { DevotionalDoor } from '../../components/devotional-door';
import type { BiblePalette } from '../../components/bible-v205/palette';
import type { Devotional } from '../devotionals';

const DEV: Devotional = {
  book: 'Genesis',
  chapter: 1,
  title: 'The Beginning of Everything',
  audioFile: 'devotional-genesis-1.m4a',
  sizeBytes: 485922,
  durationSec: 90,
  paragraphs: [],
};

const PAL = {
  primCont: '#E8DEF8',
  raspDeep: '#7B4B94',
  error: '#C75265',
  paper2: '#FFFFFF',
  ink: '#1C1B1F',
  btnDress: { borderRadius: 999 },
} as unknown as BiblePalette;

const REST_W = 114;
const SEG_W = 148;

function resetRig() {
  rig.status = 'ready';
  rig.reduceMotion = false;
  rig.session = null;
  rig.calls = [];
  rig.timingCalls = [];
  rig.animations.clear();
}

function renderDoor(foldSignal = 0) {
  const stampRef = { current: 0 };
  const morphs: boolean[] = [];
  const onListen = vi.fn();
  const element = (signal: number) => (
    <DevotionalDoor
      devotional={DEV}
      palette={PAL}
      onListen={onListen}
      foldSignal={signal}
      onMorphChange={(m) => morphs.push(m)}
      touchStampRef={stampRef}
    />
  );
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element(foldSignal));
  });
  return {
    renderer,
    stampRef,
    morphs,
    onListen,
    update: (signal: number) => {
      act(() => {
        renderer.update(element(signal));
      });
    },
  };
}

function seatOf(root: ReactTestInstance): ReactTestInstance {
  return root.findAllByType('View').find((v) => typeof v.props.onTouchStart === 'function')!;
}
function sizerOf(root: ReactTestInstance): ReactTestInstance | undefined {
  return root.findAllByType('View').find((v) => v.props.pointerEvents === 'none');
}
function pressableByLabel(root: ReactTestInstance, prefix: string): ReactTestInstance | undefined {
  return root
    .findAllByType('Pressable')
    .find((p) => typeof p.props.accessibilityLabel === 'string' && p.props.accessibilityLabel.startsWith(prefix));
}
function seatWidth(root: ReactTestInstance): number | undefined {
  const style = seatOf(root).props.style;
  const parts = Array.isArray(style) ? style : [style];
  for (const part of parts) {
    if (part && typeof part === 'object' && typeof part.width === 'number') return part.width;
  }
  return undefined;
}
function fireLayout(node: ReactTestInstance, width: number) {
  act(() => {
    node.props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width, height: 38 } } });
  });
}
/** Measure the seat at rest and the segments' natural width. */
function measure(root: ReactTestInstance) {
  fireLayout(seatOf(root), REST_W);
  const sizer = sizerOf(root);
  if (sizer) fireLayout(sizer, SEG_W);
}
function longPressPill(root: ReactTestInstance) {
  const pill = pressableByLabel(root, 'Devotional — ')!;
  act(() => {
    pill.props.onLongPress();
  });
}
async function flush(ms = 300) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
}

describe('v535 — the Devotional door pill morph', () => {
  it('the pill stands as it always did: play glyph on the phone, tap opens', () => {
    resetRig();
    const { renderer, onListen } = renderDoor();
    const pill = pressableByLabel(renderer.root, 'Devotional — ')!;
    expect(pill).toBeTruthy();
    expect(pill.findAllByType('Text').map((t) => t.children.join(''))).toContain('icon:play-arrow');
    expect(pressableByLabel(renderer.root, 'Remove the')).toBeUndefined();
    act(() => {
      pill.props.onPress();
    });
    expect(onListen).toHaveBeenCalledTimes(1);
  });

  it('off the phone: download glyph stands, the long-press does nothing at all', () => {
    resetRig();
    rig.status = 'idle';
    const { renderer, morphs } = renderDoor();
    const pill = pressableByLabel(renderer.root, 'Devotional — ')!;
    expect(pill.findAllByType('Text').map((t) => t.children.join(''))).toContain('icon:file-download');
    expect(sizerOf(renderer.root)).toBeUndefined();
    longPressPill(renderer.root);
    expect(pressableByLabel(renderer.root, 'Remove the')).toBeUndefined();
    expect(morphs).toEqual([]);
  });

  it('mid-download: the long-press does nothing either', () => {
    resetRig();
    rig.status = 'downloading';
    const { renderer, morphs } = renderDoor();
    longPressPill(renderer.root);
    expect(pressableByLabel(renderer.root, 'Remove the')).toBeUndefined();
    expect(morphs).toEqual([]);
  });

  it('the long-press stretches the seat from its rest width to the segments width over 250ms', () => {
    resetRig();
    const door = renderDoor();
    const { renderer, morphs } = door;
    measure(renderer.root);
    longPressPill(renderer.root);
    // The question stands: Remove in the error role, Keep tonal.
    const remove = pressableByLabel(renderer.root, 'Remove the')!;
    const keep = pressableByLabel(renderer.root, 'Keep the download')!;
    expect(remove).toBeTruthy();
    expect(keep).toBeTruthy();
    expect(remove.findAllByType('Text').map((t) => t.children.join(''))).toContain('icon:delete-outline');
    const removeStyle = (Array.isArray(remove.props.style) ? remove.props.style : [remove.props.style])
      .find((s: any) => s && typeof s === 'object' && s.backgroundColor);
    expect(removeStyle.backgroundColor).toBe('#C75265');
    const keepStyle = (Array.isArray(keep.props.style) ? keep.props.style : [keep.props.style])
      .find((s: any) => s && typeof s === 'object' && s.backgroundColor);
    expect(keepStyle.backgroundColor).toBe('#FFFFFF');
    // One 250ms stretch, rest → natural.
    expect(rig.timingCalls).toEqual([{ to: SEG_W, duration: 250 }]);
    rig.stepAll(250);
    door.update(0);
    expect(seatWidth(renderer.root)).toBe(SEG_W);
    expect(morphs).toEqual([true]);
  });

  it('Remove deletes the local file, folds back, and the pill lands on the download state', async () => {
    resetRig();
    const door = renderDoor();
    const { renderer, morphs } = door;
    measure(renderer.root);
    longPressPill(renderer.root);
    act(() => {
      pressableByLabel(renderer.root, 'Remove the')!.props.onPress();
    });
    expect(rig.calls).toEqual(['delete']);
    // The fold runs on the same 250ms clock, reversed.
    expect(rig.timingCalls).toEqual([
      { to: SEG_W, duration: 250 },
      { to: REST_W, duration: 250 },
    ]);
    await flush();
    const pill = pressableByLabel(renderer.root, 'Devotional — ')!;
    expect(pill).toBeTruthy();
    expect(morphs).toEqual([true, false]);
    // The delete has landed in the store: the door now reads idle.
    rig.status = 'idle';
    door.update(0);
    expect(pill.findAllByType('Text').map((t) => t.children.join(''))).toContain('icon:file-download');
  });

  it('Remove stops the live session first when it is THIS chapter playing', () => {
    resetRig();
    rig.session = { devotional: { book: 'Genesis', chapter: 1 } };
    const { renderer } = renderDoor();
    measure(renderer.root);
    longPressPill(renderer.root);
    act(() => {
      pressableByLabel(renderer.root, 'Remove the')!.props.onPress();
    });
    expect(rig.calls).toEqual(['stop', 'delete']);
  });

  it("Remove never stops another chapter's session", () => {
    resetRig();
    rig.session = { devotional: { book: 'Genesis', chapter: 2 } };
    const { renderer } = renderDoor();
    measure(renderer.root);
    longPressPill(renderer.root);
    act(() => {
      pressableByLabel(renderer.root, 'Remove the')!.props.onPress();
    });
    expect(rig.calls).toEqual(['delete']);
  });

  it('Keep folds back unchanged — nothing deleted', async () => {
    resetRig();
    const { renderer, morphs } = renderDoor();
    measure(renderer.root);
    longPressPill(renderer.root);
    act(() => {
      pressableByLabel(renderer.root, 'Keep the download')!.props.onPress();
    });
    expect(rig.calls).toEqual([]);
    await flush();
    expect(pressableByLabel(renderer.root, 'Devotional — ')).toBeTruthy();
    expect(morphs).toEqual([true, false]);
  });

  it("the page's outside-touch signal folds a standing morph; at rest it is a no-op", async () => {
    resetRig();
    const door = renderDoor(0);
    // At rest: a bump changes nothing.
    door.update(1);
    expect(door.morphs).toEqual([]);
    measure(door.renderer.root);
    longPressPill(door.renderer.root);
    expect(door.morphs).toEqual([true]);
    door.update(2);
    expect(rig.calls).toEqual([]);
    await flush();
    expect(pressableByLabel(door.renderer.root, 'Devotional — ')).toBeTruthy();
    expect(door.morphs).toEqual([true, false]);
  });

  it('the file leaving by another door folds a standing morph at once', () => {
    resetRig();
    const door = renderDoor();
    measure(door.renderer.root);
    longPressPill(door.renderer.root);
    rig.status = 'idle';
    door.update(0);
    expect(pressableByLabel(door.renderer.root, 'Remove the')).toBeUndefined();
    expect(pressableByLabel(door.renderer.root, 'Devotional — ')).toBeTruthy();
    expect(door.morphs).toEqual([true, false]);
    expect(rig.calls).toEqual([]);
  });

  it('reduce motion: the segments are simply there — no stretch, and the fold is instant', async () => {
    resetRig();
    rig.reduceMotion = true;
    const door = renderDoor();
    await flush(10); // the reduce-motion read resolves
    measure(door.renderer.root);
    longPressPill(door.renderer.root);
    expect(pressableByLabel(door.renderer.root, 'Remove the')).toBeTruthy();
    expect(rig.timingCalls).toEqual([]);
    expect(seatWidth(door.renderer.root)).toBe(SEG_W);
    act(() => {
      pressableByLabel(door.renderer.root, 'Keep the download')!.props.onPress();
    });
    expect(pressableByLabel(door.renderer.root, 'Devotional — ')).toBeTruthy();
    expect(door.morphs).toEqual([true, false]);
  });

  it("the door stamps its own touches into the page's stamp ref", () => {
    resetRig();
    const door = renderDoor();
    act(() => {
      seatOf(door.renderer.root).props.onTouchStart({ nativeEvent: { timestamp: 4242 } });
    });
    expect(door.stampRef.current).toBe(4242);
  });
});

describe('v535 — the wiring, pinned from source', () => {
  const pageSrc = readFileSync(
    join(process.cwd(), 'components', 'bible-v205', 'chapter-page.tsx'),
    'utf8',
  );
  const paletteSrc = readFileSync(
    join(process.cwd(), 'components', 'bible-v205', 'palette.ts'),
    'utf8',
  );
  const doorSrc = readFileSync(join(process.cwd(), 'components', 'devotional-door.tsx'), 'utf8');

  it('the chapter page seats the door in the doorway with the fold contract', () => {
    expect(pageSrc).toContain('<DevotionalDoor');
    expect(pageSrc).toContain('foldSignal={devotionalFoldSignal}');
    expect(pageSrc).toContain('onMorphChange={handleDevotionalMorphChange}');
    expect(pageSrc).toContain('touchStampRef={devotionalTouchStampRef}');
    // The page root folds on a touch that is not the door's own.
    expect(pageSrc).toContain('devotionalMorphedRef.current');
    expect(pageSrc).toContain('e.nativeEvent.timestamp !== devotionalTouchStampRef.current');
    expect(pageSrc).toContain('setDevotionalFoldSignal((n) => n + 1)');
    // The page no longer reads the door's download state itself.
    expect(pageSrc).not.toContain('useDevotionalDownloadState');
    expect(pageSrc).not.toContain('NO_DEVOTIONAL');
    // Disk truth is still asked on mount.
    expect(pageSrc).toContain('void refreshDevotionalDownload(devotional)');
  });

  it("the palette's error role is the theme's own token", () => {
    expect(paletteSrc).toContain('error: colors.error,');
    expect(paletteSrc).toContain('error: string;');
  });

  it('the door deletes through the one local delete and stops the session before it', () => {
    expect(doorSrc).toContain('deleteDevotionalDownload(devotional)');
    const removeBody = doorSrc.slice(doorSrc.indexOf('const handleRemove'));
    expect(removeBody.indexOf('stopDevotional()')).toBeGreaterThan(-1);
    expect(removeBody.indexOf('stopDevotional()')).toBeLessThan(
      removeBody.indexOf('deleteDevotionalDownload(devotional)'),
    );
    // The player controller is lazy-required in the handler
    // (the Ten Stops card's pattern) — never a static import, so
    // the chapter page's module tree stays free of the audio
    // runtime at import time.
    expect(doorSrc).not.toContain("from '@/lib/devotional-player'");
    expect(doorSrc).toContain("require('../lib/devotional-player')");
    // One 250ms motion, the app's emphasized curve.
    expect(doorSrc).toContain('DEVOTIONAL_MORPH_MS = 250');
    expect(doorSrc).toContain('EMPHASIZED_EASING');
  });
});
