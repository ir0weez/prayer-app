import { describe, expect, it } from 'vitest';
import { getTimeOffEventColor, isTimeOffEventVisible, readableTextColor } from './poster-color';

describe('time-off event presentation', () => {
  it('hides only off-events on ordinary days', () => {
    expect(isTimeOffEventVisible({ isOffEvent: true }, false)).toBe(false);
    expect(isTimeOffEventVisible({ isOffEvent: true }, true)).toBe(true);
    expect(isTimeOffEventVisible({}, false)).toBe(true);
  });

  it('prefers the selected event color and uses poster color as a fallback', () => {
    expect(getTimeOffEventColor({ posterColor: '#112233', color: '#ff0000' })).toBe('#ff0000');
    expect(getTimeOffEventColor({ posterColor: '#112233' })).toBe('#112233');
    expect(readableTextColor('#112233')).toBe('#FFFFFF');
    expect(readableTextColor('#f5e7a1')).toBe('#171321');
  });
});
