import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { toByteArray } from 'base64-js';
import jpeg from 'jpeg-js';

export const DEFAULT_TIME_OFF_EVENT_COLOR = '#7C5CFF';

type RgbaPixels = { data: Uint8Array | Uint8ClampedArray; width: number; height: number };

function toHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
}

function toColor(r: number, g: number, b: number) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function colorStats(r: number, g: number, b: number) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return { brightness: (r * 299 + g * 587 + b * 114) / 1000, saturation: max === 0 ? 0 : (max - min) / max };
}

/**
 * Chooses a representative poster color from decoded RGBA pixels.
 * Near-white border/background pixels are down-weighted, while colorful
 * clusters get a small boost so a pale poster is not mistaken for white.
 */
export function representativeColorFromRgba(pixels: RgbaPixels): string | null {
  const buckets = new Map<string, { r: number; g: number; b: number; weight: number; count: number }>();
  let fallbackR = 0;
  let fallbackG = 0;
  let fallbackB = 0;
  let fallbackCount = 0;

  for (let i = 0; i + 3 < pixels.data.length; i += 4) {
    const alpha = pixels.data[i + 3];
    if (alpha < 40) continue;
    const r = pixels.data[i];
    const g = pixels.data[i + 1];
    const b = pixels.data[i + 2];
    fallbackR += r;
    fallbackG += g;
    fallbackB += b;
    fallbackCount += 1;

    const { brightness, saturation } = colorStats(r, g, b);
    const isNearWhite = brightness > 245 && saturation < 0.12;
    const isNearBlack = brightness < 12 && saturation < 0.12;
    if (isNearWhite || isNearBlack) continue;

    // Quantize only for ranking; retain the real average for the final color.
    const qr = Math.floor(r / 16) * 16;
    const qg = Math.floor(g / 16) * 16;
    const qb = Math.floor(b / 16) * 16;
    const key = `${qr},${qg},${qb}`;
    const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, weight: 0, count: 0 };
    const weight = 1 + saturation * 1.5;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    bucket.weight += weight;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  if (buckets.size > 0) {
    const winner = [...buckets.values()].sort((a, b) => {
      const scoreA = a.count * (1 + Math.min(a.weight / a.count, 2) * 0.35);
      const scoreB = b.count * (1 + Math.min(b.weight / b.count, 2) * 0.35);
      return scoreB - scoreA;
    })[0];
    return toColor(winner.r / winner.weight, winner.g / winner.weight, winner.b / winner.weight);
  }

  return fallbackCount ? toColor(fallbackR / fallbackCount, fallbackG / fallbackCount, fallbackB / fallbackCount) : null;
}

export function readableTextColor(background: string): '#FFFFFF' | '#171321' {
  const match = background.match(/^#([0-9a-f]{6})$/i);
  if (!match) return '#FFFFFF';
  const r = parseInt(match[1].slice(0, 2), 16);
  const g = parseInt(match[1].slice(2, 4), 16);
  const b = parseInt(match[1].slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? '#171321' : '#FFFFFF';
}

async function decodePosterOnNative(uri: string): Promise<RgbaPixels | null> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 48 } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!result.base64) return null;
    const decoded = jpeg.decode(toByteArray(result.base64), { useTArray: true });
    return { data: decoded.data, width: decoded.width, height: decoded.height };
  } catch {
    return null;
  }
}

async function decodePosterOnWeb(uri: string): Promise<RgbaPixels | null> {
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = uri;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Unable to decode poster'));
    });
    const size = 32;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    return { data: context.getImageData(0, 0, size, size).data, width: size, height: size };
  } catch {
    return null;
  }
}

/** Extract a representative color from an attached poster on web and native builds. */
export async function extractPosterColor(uri: string, fallback = DEFAULT_TIME_OFF_EVENT_COLOR): Promise<string> {
  const pixels = Platform.OS === 'web' && typeof document !== 'undefined'
    ? await decodePosterOnWeb(uri)
    : await decodePosterOnNative(uri);
  return representativeColorFromRgba(pixels ?? { data: new Uint8Array(), width: 0, height: 0 }) ?? fallback;
}

export function getTimeOffEventColor(event: { posterColor?: string; color?: string }) {
  return event.posterColor || event.color || DEFAULT_TIME_OFF_EVENT_COLOR;
}

export function isTimeOffEventVisible(event: { isOffEvent?: boolean }, isTimeOffDay: boolean) {
  return !event.isOffEvent || isTimeOffDay;
}
