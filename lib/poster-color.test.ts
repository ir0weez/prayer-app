import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));
vi.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  manipulateAsync: vi.fn(),
}));
vi.mock('jpeg-js', () => ({ default: { decode: vi.fn() } }));

import { getTimeOffEventColor, isTimeOffEventVisible, readableTextColor, representativeColorFromRgba } from './poster-color';

describe('time-off event presentation', () => {
  it('hides only off-events on ordinary days', () => {
    expect(isTimeOffEventVisible({ isOffEvent: true }, false)).toBe(false);
    expect(isTimeOffEventVisible({ isOffEvent: true }, true)).toBe(true);
    expect(isTimeOffEventVisible({}, false)).toBe(true);
  });

  it('prefers the poster color and uses the selected color as a fallback', () => {
    expect(getTimeOffEventColor({ posterColor: '#112233', color: '#ff0000' })).toBe('#112233');
    expect(getTimeOffEventColor({ posterColor: '#112233' })).toBe('#112233');
    expect(readableTextColor('#112233')).toBe('#FFFFFF');
    expect(readableTextColor('#f5e7a1')).toBe('#171321');
  });

  it('ignores pure white poster backgrounds when selecting the representative color', () => {
    const pixels = new Uint8Array([
      255, 255, 255, 255,
      255, 255, 255, 255,
      228, 190, 72, 255,
      228, 190, 72, 255,
    ]);

    expect(representativeColorFromRgba({ data: pixels, width: 2, height: 2 })).toBe('#e4be48');
  });
});
