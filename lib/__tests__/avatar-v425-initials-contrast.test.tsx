// ─── v425: avatar initials contrast ─────────────────────────────────────────
// The initials fallback in AvatarImage always rendered white
// bold initials — on a pale stored avatarColor (William Fren's
// cream, in the Journal "Carried this week" row) they washed
// out almost to invisibility. v425 picks the ink by the
// ground's luminance, at the component level so every surface
// benefits: white on dark/saturated grounds (unchanged), the
// theme's dark ink on pale ones. Only the initials branch is
// touched — photo/character/shiny/hero carry their own art.
import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  },
}));

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

vi.mock('@/hooks/use-colors', () => ({
  useColors: () => ({
    surface: '#F4F1EA',
    foreground: '#2A2140',
    background: '#FFFFFF',
    border: '#DDD6C8',
    muted: '#8A8170',
    primary: '#7C3AED',
  }),
}));

// No avatar art in this rig: every render lands on the initials
// fallback, which is the branch under test.
vi.mock('@/lib/avatar-system', () => ({
  AVATAR_DEFINITIONS: [],
  HERO_ACHIEVEMENTS: [],
  HERO_AVATARS: {},
  SHINY_ACHIEVEMENTS: [],
  SHINY_AVATARS: {},
  SHINY_AVATAR_THUMBNAILS: {},
  SHINY_HERO_AVATARS: {},
  STYLE_ORDER: [],
  getAvatarDefinitionForPerson: () => undefined,
}));

vi.mock('@/lib/book-avatars', () => ({
  BOOK_AVATAR_BY_ID: {},
  BOOK_AVATAR_DEFINITIONS: [],
}));

vi.mock('@/lib/avatar-aura', () => ({
  auraRingStyle: () => ({}),
  getAvatarAura: () => null,
  getPersonalProfileAura: () => null,
}));

import { AvatarImage, hexRelativeLuminance, initialsColorForBackground } from '../../components/avatar-system';

const DARK_INK = '#2A2140';

describe('v425 — initialsColorForBackground', () => {
  it('keeps white initials on dark and saturated grounds', () => {
    expect(initialsColorForBackground('#1B5E20', DARK_INK)).toBe('#FFFFFF'); // deep green
    expect(initialsColorForBackground('#7C3AED', DARK_INK)).toBe('#FFFFFF'); // saturated violet
    expect(initialsColorForBackground('#000000', DARK_INK)).toBe('#FFFFFF');
  });

  it('switches to the dark ink on pale grounds', () => {
    expect(initialsColorForBackground('#F3E9CF', DARK_INK)).toBe(DARK_INK); // William Fren's cream
    expect(initialsColorForBackground('#FFFFFF', DARK_INK)).toBe(DARK_INK);
    expect(initialsColorForBackground('#FFF', DARK_INK)).toBe(DARK_INK); // shorthand hex reads too
  });

  it('an unreadable value keeps the historic white rather than guessing', () => {
    expect(initialsColorForBackground('cream', DARK_INK)).toBe('#FFFFFF');
    expect(hexRelativeLuminance('cream')).toBeNull();
    expect(hexRelativeLuminance('#000000')).toBe(0);
    expect(hexRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });
});

describe('v425 — the rendered initials wear the chosen ink', () => {
  const renderAvatar = (fallbackColor: string) =>
    renderToString(
      React.createElement(AvatarImage, {
        id: 'person-william-fren',
        name: 'William Fren',
        fallbackColor,
      }),
    ).replace(/<!-- -->/g, '');

  const initialsColorIn = (html: string): string => {
    const at = html.indexOf('WF');
    expect(at, 'the WF initials render').toBeGreaterThan(-1);
    const before = html.slice(Math.max(0, at - 400), at);
    const matches = [...before.matchAll(/color:rgba\((\d+),(\d+),(\d+)/g)];
    expect(matches.length, 'a text colour precedes the initials').toBeGreaterThan(0);
    const [r, g, b] = matches[matches.length - 1].slice(1).map(Number);
    return `rgb(${r},${g},${b})`;
  };

  it('cream ground → dark initials (rgb 42,33,64)', () => {
    expect(initialsColorIn(renderAvatar('#F3E9CF'))).toBe('rgb(42,33,64)');
  });

  it('deep green ground → white initials (rgb 255,255,255), unchanged', () => {
    expect(initialsColorIn(renderAvatar('#1B5E20'))).toBe('rgb(255,255,255)');
  });
});
