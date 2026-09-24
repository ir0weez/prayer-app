export const DEFAULT_TIME_OFF_EVENT_COLOR = '#7C5CFF';

function toHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

export function readableTextColor(background: string): '#FFFFFF' | '#171321' {
  const match = background.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '#FFFFFF';
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? '#171321' : '#FFFFFF';
}

/**
 * Extract a representative color without making poster selection fail. Web can
 * sample the decoded image through canvas; native builds retain the supplied
 * fallback because React Native does not expose decoded pixels in Expo Image.
 */
export async function extractPosterColor(uri: string, fallback = DEFAULT_TIME_OFF_EVENT_COLOR): Promise<string> {
  if (typeof document === 'undefined' || typeof window === 'undefined') return fallback;
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = uri;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to decode poster'));
    });
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return fallback;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 40) continue;
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      count += 1;
    }
    return count ? `#${toHex(r / count)}${toHex(g / count)}${toHex(b / count)}` : fallback;
  } catch {
    return fallback;
  }
}

export function getTimeOffEventColor(event: { posterColor?: string; color?: string }) {
  // The poster's extracted main color is authoritative for illustrated
  // off-events. The selected event color remains the fallback when no poster
  // color is available.
  return event.posterColor || event.color || DEFAULT_TIME_OFF_EVENT_COLOR;
}

export function isTimeOffEventVisible(event: { isOffEvent?: boolean }, isTimeOffDay: boolean) {
  return !event.isOffEvent || isTimeOffDay;
}
