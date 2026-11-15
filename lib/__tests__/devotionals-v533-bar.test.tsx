/**
 * v533 — the "Download all" bar's naming header, pinned at the
 * component (Concept 3 from download-all-label-v1.html,
 * Jonathan's pick, Nov 15). The header stands directly above
 * the bar in the same seat, in every state the bar stands in:
 *
 *   left — "Devotionals" in small letterspaced caps, dressed in
 *     the book's own colour family (the palette's deep role —
 *     the same role the bar's words wear; nothing pinned to a
 *     hex, the stub palette's values are what must come out);
 *   right — "N of M on this phone" in the quiet grey, read off
 *     the same progress the bar reads, so it follows chapters
 *     as they land mid-run and reads M of M when complete.
 *
 * The bar itself keeps its v527 wording and dress in every
 * state — pinned here alongside, unchanged. A book with no
 * registered devotionals renders nothing at all: no header,
 * no bar, no dead door. (The count's derivation from the disk
 * is pinned in devotionals-v533.test.ts; here the download
 * store is stubbed so this file is about the seat and dress.)
 */
import React from 'react';
import TestRenderer, { act, type ReactTestRenderer } from 'react-test-renderer';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('react-native', async () => {
  const rnw = await import('react-native-web');
  return {
    ...rnw,
    Platform: { OS: 'android', select: (o: any) => o.android ?? o.default },
  };
});

vi.mock('@expo/vector-icons/MaterialIcons', async () => {
  const React = await import('react');
  const { Text } = await import('react-native-web');
  return {
    default: (props: any) =>
      React.createElement(Text, { style: { color: props.color, fontSize: props.size } }, `icon:${props.name}`),
  };
});

// The download store is stubbed: each test sets the progress
// and the run state the component reads.
const rig = vi.hoisted(() => ({
  progress: {
    chapterCount: 4,
    downloadedCount: 0,
    downloadedBytes: 0,
    // Ruth's real hosted total (the registry's four sizes).
    totalBytes: 2179546,
    allDownloaded: false,
  } as {
    chapterCount: number;
    downloadedCount: number;
    downloadedBytes: number;
    totalBytes: number;
    allDownloaded: boolean;
  },
  run: { status: 'idle' } as any,
}));
vi.mock('@/lib/devotional-download', () => ({
  refreshBookDevotionalDownloads: async () => {},
  startBookDevotionalDownload: async () => {},
  cancelBookDevotionalDownload: async () => {},
  deleteBookDevotionalDownloads: async () => {},
  // The real wording, pinned against the real function in
  // devotionals-v533.test.ts.
  devotionalOnPhoneLabel: (p: any) => `${p.downloadedCount} of ${p.chapterCount} on this phone`,
  useBookDevotionalDownloadState: () => rig.run,
  useBookDevotionalProgress: () => rig.progress,
}));

import { DevotionalDownloadAllBar } from '../../components/devotional-download-all';

// A stub book palette (Genesis red family values): what the
// header must wear is THESE roles, never a hex of its own.
const pal = {
  primCont: '#F9DEDC',
  rasp: '#C62828',
  raspDeep: '#8E1414',
  line: '#E5E0D8',
  inkSoft: '#5A6480',
} as any;

async function renderBar(book: string) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(DevotionalDownloadAllBar, { book, palette: pal }),
    );
  });
  await act(async () => {});
  return renderer.root;
}

function textOf(node: any): string {
  const parts: string[] = [];
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === 'string') {
      parts.push(n);
      return;
    }
    if (typeof n === 'number') {
      parts.push(String(n));
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(walk);
      return;
    }
    if (typeof n === 'object' && n.props) walk(n.props.children);
  };
  walk(node);
  return parts.join('');
}

/** Every string leaf in the tree, in document order. */
function renderedText(root: any): string {
  const texts: string[] = [];
  const walk = (instance: any) => {
    for (const child of instance.children ?? []) {
      if (typeof child === 'string') texts.push(child);
      else walk(child);
    }
  };
  walk(root);
  return texts.join(' ');
}

/** The HOST node (react-native-web's div) whose own text is
 * exactly the given string. RNW computes colours to rgba()
 * strings inline on the host node — the dress pins read those,
 * so what is asserted is the role value as rendered. */
function hostNodeWithText(root: any, text: string) {
  const found = root.findAll((n: any) => n.type === 'div' && textOf(n).trim() === text);
  expect(found.length, `host node "${text}"`).toBeGreaterThan(0);
  return found[0];
}

/** '#8E1414' → 'rgba(142,20,20,1.00)' — RNW's computed form. */
function rgbaOf(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},1.00)`;
}

const componentSource = readFileSync(
  join(process.cwd(), 'components', 'devotional-download-all.tsx'),
  'utf8',
);

/** One style block out of the component's StyleSheet, by key. */
function styleBlock(key: string): string {
  const at = componentSource.indexOf(`  ${key}: {`);
  expect(at, `style block ${key}`).toBeGreaterThan(-1);
  return componentSource.slice(at, componentSource.indexOf('},', at));
}

function setState(next: { progress?: Partial<typeof rig.progress>; run?: any }) {
  rig.progress = {
    chapterCount: 4,
    downloadedCount: 0,
    downloadedBytes: 0,
    totalBytes: 2179546,
    allDownloaded: false,
    ...next.progress,
  };
  rig.run = next.run ?? { status: 'idle' };
}

describe('v533 bar — the naming header stands over the bar', () => {
  it('idle, none landed: "Devotionals" and "0 of 4 on this phone" above "Download all"', async () => {
    setState({});
    const root = await renderBar('Ruth');
    const text = renderedText(root);
    expect(text).toContain('Devotionals');
    expect(text).toContain('0 of 4 on this phone');
    expect(text).toContain('Download all');
    expect(text).toContain('2.1 MB');
    // The header stands ABOVE the bar in the tree.
    expect(text.indexOf('Devotionals')).toBeLessThan(text.indexOf('Download all'));
    expect(text.indexOf('0 of 4 on this phone')).toBeLessThan(text.indexOf('Download all'));
  });

  it('idle, some landed: the count follows the chapters on disk', async () => {
    setState({ progress: { downloadedCount: 2, downloadedBytes: 1089773 } });
    const root = await renderBar('Ruth');
    expect(renderedText(root)).toContain('2 of 4 on this phone');
    expect(renderedText(root)).toContain('Download all');
  });

  it('downloading: the header stands, the count follows landed chapters, the bar keeps its progress + Cancel', async () => {
    setState({
      progress: { downloadedCount: 2, downloadedBytes: 1089773 },
      run: { status: 'downloading', downloadedBytes: 1089773, totalBytes: 2179546, fraction: 0.5, chapter: 3 },
    });
    const root = await renderBar('Ruth');
    const text = renderedText(root);
    expect(text).toContain('Devotionals');
    expect(text).toContain('2 of 4 on this phone');
    // The progress line's pieces land as separate leaves
    // ("Downloading…", "50", "%") — compare whitespace-free.
    expect(text.replace(/\s+/g, '')).toContain('Downloading…50%');
    expect(text).toContain('Cancel');
    expect(text.indexOf('Devotionals')).toBeLessThan(text.indexOf('Downloading…'));
  });

  it('error: the header stands over the bar’s error + Retry', async () => {
    setState({
      progress: { downloadedCount: 1, downloadedBytes: 500000 },
      run: { status: 'error', message: 'The download could not finish. Please try again.' },
    });
    const root = await renderBar('Ruth');
    const text = renderedText(root);
    expect(text).toContain('Devotionals');
    expect(text).toContain('1 of 4 on this phone');
    expect(text).toContain('The download could not finish. Please try again.');
    expect(text).toContain('Retry');
  });

  it('complete: "4 of 4 on this phone" over "Downloaded"', async () => {
    setState({ progress: { downloadedCount: 4, downloadedBytes: 2179546, allDownloaded: true } });
    const root = await renderBar('Ruth');
    const text = renderedText(root);
    expect(text).toContain('Devotionals');
    expect(text).toContain('4 of 4 on this phone');
    expect(text).toContain('Downloaded');
    expect(text.indexOf('4 of 4 on this phone')).toBeLessThan(text.indexOf('Downloaded'));
  });

  it('a book with no registered devotionals renders nothing — no header, no bar', async () => {
    setState({});
    const root = await renderBar('Exodus');
    expect(renderedText(root)).toBe('');
    expect(root.findAll((n: any) => typeof n.props?.onPress === 'function')).toEqual([]);
  });
});

describe('v533 bar — the header’s dress derives, nothing pinned', () => {
  it('the label wears the book family’s deep role (raspDeep), as rendered', async () => {
    setState({});
    const root = await renderBar('Ruth');
    const style = hostNodeWithText(root, 'Devotionals').props.style ?? {};
    expect(style.color).toBe(rgbaOf(pal.raspDeep));
    // …and the wiring is the role, not a value of its own.
    const headerAt = componentSource.indexOf('const header = (');
    const headerJsx = componentSource.slice(headerAt, componentSource.indexOf(');', headerAt));
    expect(headerJsx).toContain('color: pal.raspDeep');
  });

  it('the label stands at the drawing’s measure — 11px letterspaced caps, weight 700', () => {
    expect(componentSource).toContain(
      "headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' }",
    );
  });

  it('the count wears the quiet grey role (inkSoft) at 12px, right-aligned by the auto margin', async () => {
    setState({});
    const root = await renderBar('Ruth');
    const style = hostNodeWithText(root, '0 of 4 on this phone').props.style ?? {};
    expect(style.color).toBe(rgbaOf(pal.inkSoft));
    const headerAt = componentSource.indexOf('const header = (');
    const headerJsx = componentSource.slice(headerAt, componentSource.indexOf(');', headerAt));
    expect(headerJsx).toContain('color: pal.inkSoft');
    expect(componentSource).toContain("headerCount: { marginLeft: 'auto', fontSize: 12 }");
  });

  it('the seat: the header carries the bar’s old 12px top margin and the drawing’s 7px breath; the bar sets none', () => {
    const header = styleBlock('header');
    expect(header).toContain('marginTop: 12');
    expect(header).toContain('marginBottom: 7');
    expect(header).toContain('paddingHorizontal: 4');
    expect(header).toContain("alignItems: 'baseline'");
    expect(styleBlock('bar')).not.toContain('marginTop');
  });

  it('the whole seat stays flat — no shadow, no elevation anywhere in the component (the book page’s standing rule)', () => {
    expect(componentSource).not.toContain('boxShadow');
    expect(componentSource).not.toContain('elevation');
  });

  it('the bar keeps its v527 dress — the tonal container in the book family', async () => {
    setState({});
    const root = await renderBar('Ruth');
    const barHost = root.findAll(
      (n: any) => n.type === 'div' && n.props?.['aria-label'] === 'Download all Ruth devotionals',
    )[0];
    expect(barHost).toBeDefined();
    expect((barHost.props.style ?? {}).backgroundColor).toBe(rgbaOf(pal.primCont));
  });
});
