// ─── Devotional share (v536) ────────────────────────────────────────────────
// Five shares from the chapter devotional player (Jonathan, Nov 15:
// "add a Share button to devotionals… I'd love to share some of
// these to Instagram"): the AUDIO itself, a SQUARE CARD and a
// STORY CARD (still pictures in the approved Concept 1 "Deep
// colour" dress — mockups devotional-share-card-v1 + -v8), and a
// SQUARE VIDEO and a STORY VIDEO — the card alive with the
// devotional's own audio baked in, wearing exactly the five
// motions of the v8 drawing and no more (the level-meter bars
// he looked at and cut stay cut — pinned absent below).
//
// Everything here is a MODEL: the card is a pure function of the
// registry entry + the book's colour family, the video's motions
// are pure functions of time, and the native maker
// (modules/expo-devotional-share) is a dumb painter that draws
// the numbers this file hands it — one model driving the stills
// and every video frame alike. Generated artifacts live in the
// app's CACHE directory under devotional-share/; they are not
// downloads and never touch the downloads store, the Downloads
// page or the storage bar (the audio share hands over the
// chapter's own downloaded file, in place).

import { BOOK_HUE_LIGHT, bookHueFor } from './bible-v205/book-colors';
import { devotionalLocalSource } from './devotional-download';
import { formatClock, type Devotional } from './devotionals';
import { hexToHsl, hslToHex } from './skin-themes';

// ─── The five shares ────────────────────────────────────────────────────────

export type DevotionalShareKind =
  | 'audio'
  | 'square-card'
  | 'story-card'
  | 'square-video'
  | 'story-video';

export type DevotionalShareCardFormat = 'square' | 'story';

export interface DevotionalShareButton {
  kind: DevotionalShareKind;
  label: string;
}

/** The Share group's five buttons, in their standing order. */
export const DEVOTIONAL_SHARE_BUTTONS: readonly DevotionalShareButton[] = [
  { kind: 'audio', label: 'Audio' },
  { kind: 'square-card', label: 'Square card' },
  { kind: 'story-card', label: 'Story card' },
  { kind: 'square-video', label: 'Square video' },
  { kind: 'story-video', label: 'Story video' },
];

// ─── The group's kinds (v541) ───────────────────────────────────────────────
// The Share group's seat, rebuilt as Concept 2 "Kind first"
// (mockup player-share-cleanup-v1; Jonathan's pick, Nov 15:
// "Just use concept 2 from here"). The group leads with three
// kinds in one segmented bar — Audio | Card | Video — and the
// picked kind shows its two shapes beneath the bar. Audio is
// an ACTION, not a selection: it shares the chapter's file at
// a tap and shows no variants. Card and Video are selections:
// Card shows the two stills, Video the two videos, each in the
// standing square-then-story order. The five shares themselves
// — their generation, their dress, their cache rule — are
// exactly the v536 set above; only the seat changed.

export type DevotionalShareGroupKind = 'audio' | 'card' | 'video';

/** The kinds that carry variants — the selectable segments. */
export type DevotionalShareVariantKind = Exclude<DevotionalShareGroupKind, 'audio'>;

export interface DevotionalShareGroupSegment {
  kind: DevotionalShareGroupKind;
  label: string;
}

/** The segmented bar's three segments, in the drawing's order. */
export const DEVOTIONAL_SHARE_GROUP_SEGMENTS: readonly DevotionalShareGroupSegment[] = [
  { kind: 'audio', label: 'Audio' },
  { kind: 'card', label: 'Card' },
  { kind: 'video', label: 'Video' },
];

/** The kind the group opens on — the drawing's selected
 * segment. Screen-local, never persisted. */
export const DEVOTIONAL_SHARE_DEFAULT_KIND: DevotionalShareVariantKind = 'card';

/** The variants a kind shows beneath the bar: Audio shows
 * none (it is the share itself); Card the two still kinds,
 * Video the two video kinds. */
export function shareGroupVariants(
  kind: DevotionalShareGroupKind,
): readonly DevotionalShareKind[] {
  switch (kind) {
    case 'audio':
      return [];
    case 'card':
      return ['square-card', 'story-card'];
    case 'video':
      return ['square-video', 'story-video'];
  }
}

/** A variant box's name — the shape alone, since the bar above
 * it already says card or video. Null for the audio share,
 * which has no variant box. */
export function shareVariantName(kind: DevotionalShareKind): string | null {
  switch (shareKindFormat(kind)) {
    case 'square':
      return 'Square';
    case 'story':
      return 'Story';
    default:
      return null;
  }
}

/** A variant box's sub-line, the drawing's own: where the
 * shape is headed — the square to the feed, the story full
 * screen. Null for the audio share. */
export function shareVariantSubLabel(kind: DevotionalShareKind): string | null {
  switch (shareKindFormat(kind)) {
    case 'square':
      return 'Feed post';
    case 'story':
      return 'Full screen';
    default:
      return null;
  }
}

export function shareKindFormat(kind: DevotionalShareKind): DevotionalShareCardFormat | null {
  switch (kind) {
    case 'square-card':
    case 'square-video':
      return 'square';
    case 'story-card':
    case 'story-video':
      return 'story';
    case 'audio':
      return null;
  }
}

export function shareKindIsVideo(kind: DevotionalShareKind): boolean {
  return kind === 'square-video' || kind === 'story-video';
}

export function shareArtifactMimeType(kind: DevotionalShareKind): string {
  switch (kind) {
    case 'audio':
      return 'audio/mp4';
    case 'square-card':
    case 'story-card':
      return 'image/png';
    case 'square-video':
    case 'story-video':
      return 'video/mp4';
  }
}

function bookSlug(book: string): string {
  return book.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** The file name a share artifact carries. The audio share is the
 * chapter's own downloaded file under its own name — no copy is
 * ever made; the generated four are named for what they are. */
export function shareArtifactFileName(kind: DevotionalShareKind, d: Devotional): string {
  if (kind === 'audio') return d.audioFile;
  return `prayercircle-${bookSlug(d.book)}-${d.chapter}-${kind}.${shareKindIsVideo(kind) ? 'mp4' : 'png'}`;
}

/** Where a generated artifact lives: the cache directory's
 * devotional-share/ folder, or null for the audio share (which
 * is never in the cache) and without a cache directory. */
export function shareArtifactCachePath(
  cacheDirectory: string | null,
  kind: DevotionalShareKind,
  d: Devotional,
): string | null {
  if (kind === 'audio') return null;
  if (typeof cacheDirectory !== 'string' || cacheDirectory.length === 0) return null;
  const base = cacheDirectory.endsWith('/') ? cacheDirectory : `${cacheDirectory}/`;
  return `${base}devotional-share/${shareArtifactFileName(kind, d)}`;
}

// ─── The card's colours ─────────────────────────────────────────────────────
// The approved drawing's instance is James (mockup
// devotional-share-card-v1, Concept 1): deep #3D2B5C wall-to-wall,
// kicker #C9B8EC, the footer's pale #E6DEFA, white type. As with
// the player theme (lib/devotional-player-theme.ts), the instance
// is pinned as stops — each colour's hue offset from its book's
// band hue (lib/bible-v205/book-colors.ts, the v420 ROYGBIV
// constants), its saturation and lightness the drawing's — and
// every book derives at the same stops. James re-derives to the
// drawing's exact hexes (pinned in the v536 tests).

interface CardStop {
  hue: number;
  s: number;
  l: number;
}

const CARD_DEEP_STOP: CardStop = { hue: -20.096588, s: 0.362963, l: 0.264706 }; // James #3D2B5C
const CARD_KICKER_STOP: CardStop = { hue: -22.52202, s: 0.577778, l: 0.823529 }; // James #C9B8EC
const CARD_PALE_STOP: CardStop = { hue: -24.994547, s: 0.736842, l: 0.92549 }; // James #E6DEFA

export interface DevotionalShareCardColors {
  /** The wall-to-wall ground: the family's deep colour. */
  deep: string;
  /** The kicker and the LISTEN line: the family's light tone. */
  kicker: string;
  /** The duration text and the wave: the family's pale tone. */
  pale: string;
  /** Title and brand type — white in every family (the drawing). */
  white: string;
}

/** The card colours for one book, derived from its band hue at
 * the drawing's stops. A name outside the canon falls back to the
 * mockup's red base, the player theme's own fallback. */
export function devotionalShareCardColors(book: string): DevotionalShareCardColors {
  const hueId = bookHueFor(book);
  const baseHex = hueId ? BOOK_HUE_LIGHT[hueId].primary : '#C62828';
  const bandHue = hexToHsl(baseHex).h;
  // The drawing's offsets are negative (its stops sit a few
  // degrees below the band hue); hslToHex does not wrap, so the
  // sum is wrapped into [0, 360) here — for the low bands (red,
  // orange, yellow) the unwrapped sum would slide under zero
  // and out of the family entirely.
  const stop = (def: CardStop) =>
    hslToHex({ h: (((bandHue + def.hue) % 360) + 360) % 360, s: def.s, l: def.l });
  return {
    deep: stop(CARD_DEEP_STOP),
    kicker: stop(CARD_KICKER_STOP),
    pale: stop(CARD_PALE_STOP),
    white: '#FFFFFF',
  };
}

// ─── The card model ─────────────────────────────────────────────────────────
// Layout values are the mockups' own measures scaled to the
// export canvas: the square from the 340px drawing (×1080/340),
// the story from the 300×533 drawing (×3.6). The square still is
// Concept 1 exactly (kicker, title, corner ghost, footer). The
// story still is the v8 centred composition (equal breathing room
// above the kicker and below the brand row, ghost centred, disc
// under the title, the bar + LISTEN line + time/brand row in the
// bottom group). The videos wear the v8 element set in their own
// frame (the square video gains the disc and the bar its still
// does not carry — the brief's "the card alive, per the v8
// mockup's motion set").

export interface DevotionalShareWaveModel {
  canvasHeight: number;
  wavelength: number;
  amplitude: number;
  strokeWidth: number;
  trackThickness: number;
  stopDotRadius: number;
}

/** The bar's wave, in the app's own wavy family numbers
 * (components/wavy-progress.tsx, v339/v342): wavelength
 * max(20, canvasHeight × 3.5), stroke canvasHeight × 0.55,
 * amplitude what remains of the half-canvas, track
 * canvasHeight × 0.45, stop dot canvasHeight × 0.26. */
export function devotionalShareWaveModel(canvasHeight: number): DevotionalShareWaveModel {
  const wavelength = Math.max(20, canvasHeight * 3.5);
  const strokeWidth = Math.max(2, canvasHeight * 0.55);
  return {
    canvasHeight,
    wavelength,
    amplitude: Math.max(0, canvasHeight / 2 - strokeWidth / 2),
    strokeWidth,
    trackThickness: Math.max(2, canvasHeight * 0.45),
    stopDotRadius: Math.max(1.6, canvasHeight * 0.26),
  };
}

export interface DevotionalShareCardLayout {
  padSide: number;
  padTop: number;
  padBottom: number;
  kickerSize: number;
  kickerLetterSpacing: number;
  titleSize: number;
  /** Line height as a multiple of the title size (the drawings' 1.16). */
  titleLineHeight: number;
  titleMarginTop: number;
  ghostSize: number;
  /** Ghost's right-edge distance past the canvas's right edge. */
  ghostRight: number;
  /** Square: the ghost's bottom-edge distance past the canvas's
   * bottom edge. Story: null — the ghost is centred vertically. */
  ghostBottom: number | null;
  /** 0 = the format carries no disc (the square still). */
  discDiameter: number;
  discMarginTop: number;
  discGlyphSize: number;
  /** 0 = the format carries no bar (the square still). */
  barCanvasHeight: number;
  barMarginBottom: number;
  listenSize: number;
  listenLetterSpacing: number;
  listenMarginBottom: number;
  durationSize: number;
  brandSize: number;
  brandLetterSpacing: number;
  /** The square still's footer play glyph (the videos' footer
   * carries no glyph — their disc is the play mark). */
  footerPlayGlyphSize: number;
}

export interface DevotionalShareCardModel {
  format: DevotionalShareCardFormat;
  width: number;
  height: number;
  colors: DevotionalShareCardColors;
  /** "JAMES · CHAPTER 1 · DEVOTIONAL" — the book's own name,
   * uppercased, the chapter's own number. */
  kicker: string;
  /** The devotional's title, verbatim from the registry. */
  title: string;
  /** The displayed duration (registry durationSec, m:ss). */
  durationLabel: string;
  brand: string;
  listenLine: string;
  /** The ghost numeral: the chapter number itself. */
  ghostText: string;
  layout: DevotionalShareCardLayout;
  /** The bar's wave model, or null where the format has no bar. */
  wave: DevotionalShareWaveModel | null;
  /** The progress a STILL draws its bar at: the story still sits
   * at its start — exactly one wavelength of wave, then the
   * straight track and the end dot (the v8 drawing's opening
   * frame). 0 where there is no bar. */
  stillProgress: number;
}

const SQUARE_LAYOUT: DevotionalShareCardLayout = {
  padSide: 95,
  padTop: 95,
  padBottom: 83,
  kickerSize: 38,
  kickerLetterSpacing: 7.6,
  titleSize: 111,
  titleLineHeight: 1.16,
  titleMarginTop: 51,
  ghostSize: 953,
  ghostRight: 57,
  ghostBottom: 203,
  discDiameter: 0,
  discMarginTop: 0,
  discGlyphSize: 0,
  barCanvasHeight: 0,
  barMarginBottom: 0,
  listenSize: 0,
  listenLetterSpacing: 0,
  listenMarginBottom: 0,
  durationSize: 41,
  brandSize: 41,
  brandLetterSpacing: 1.3,
  footerPlayGlyphSize: 38,
};

const STORY_LAYOUT: DevotionalShareCardLayout = {
  padSide: 101,
  padTop: 166,
  padBottom: 166,
  kickerSize: 41,
  kickerLetterSpacing: 8.6,
  titleSize: 137,
  titleLineHeight: 1.16,
  titleMarginTop: 58,
  ghostSize: 1224,
  ghostRight: 108,
  ghostBottom: null,
  discDiameter: 209,
  discMarginTop: 108,
  discGlyphSize: 72,
  barCanvasHeight: 50,
  barMarginBottom: 58,
  listenSize: 40,
  listenLetterSpacing: 7.2,
  listenMarginBottom: 36,
  durationSize: 47,
  brandSize: 50,
  brandLetterSpacing: 1.4,
  footerPlayGlyphSize: 0,
};

/** The square VIDEO's layout: the v1 frame wearing the v8 element
 * set (disc under the title, bar + LISTEN line in the bottom
 * group), at the square's own measures. */
const SQUARE_VIDEO_LAYOUT: DevotionalShareCardLayout = {
  ...SQUARE_LAYOUT,
  ghostBottom: 203,
  discDiameter: 166,
  discMarginTop: 86,
  discGlyphSize: 58,
  barCanvasHeight: 50,
  barMarginBottom: 51,
  listenSize: 38,
  listenLetterSpacing: 7,
  listenMarginBottom: 32,
  footerPlayGlyphSize: 0,
};

/** The card model for one devotional in one format. `video`
 * selects the living layout (the square video's extra elements);
 * the story's still and video share one layout. */
export function devotionalShareCardModel(
  d: Devotional,
  format: DevotionalShareCardFormat,
  video = false,
): DevotionalShareCardModel {
  const width = 1080;
  const height = format === 'square' ? 1080 : 1920;
  const layout =
    format === 'story' ? STORY_LAYOUT : video ? SQUARE_VIDEO_LAYOUT : SQUARE_LAYOUT;
  const wave = layout.barCanvasHeight > 0 ? devotionalShareWaveModel(layout.barCanvasHeight) : null;
  const barWidth = width - layout.padSide * 2;
  return {
    format,
    width,
    height,
    colors: devotionalShareCardColors(d.book),
    kicker: `${d.book.toUpperCase()} · CHAPTER ${d.chapter} · DEVOTIONAL`,
    title: d.title,
    durationLabel: formatClock(d.durationSec),
    brand: 'PrayerCircle',
    listenLine: 'LISTEN IN PRAYERCIRCLE',
    ghostText: String(d.chapter),
    layout,
    wave,
    stillProgress: wave ? wave.wavelength / barWidth : 0,
  };
}

// ─── The video's motions ────────────────────────────────────────────────────
// Exactly five, the v8 drawing's set. Nothing else moves — and
// in particular there is NO level-meter / voice-reactive bar of
// any kind: Jonathan saw one in the v4 drawing and cut it ("I
// don't like the sound bar really…"). The v536 tests pin this
// list's size and the absence of any such element in the share
// sources.

export const SHARE_VIDEO_MOTIONS: readonly string[] = [
  'entrance',
  'ghost-drift',
  'breathing-disc',
  'audio-bar',
  'light-sweep',
];

export const SHARE_VIDEO_FPS = 30;
/** Entrance: each element settles over this long, staggered by
 * the delays below — the last lands at 0.34 + 0.76 = 1.10s, the
 * drawing's first ~1.1s. Material standard easing. */
export const SHARE_VIDEO_ENTRANCE_DURATION_SEC = 0.76;
export const SHARE_VIDEO_ENTRANCE_DELAYS_SEC: readonly number[] = [0.1, 0.22, 0.34];
/** The breath ring's loop (the drawing's 3.2s). */
export const SHARE_VIDEO_BREATH_PERIOD_SEC = 3.2;
/** The light sweep's cycle (the drawing's 9s). */
export const SHARE_VIDEO_SWEEP_PERIOD_SEC = 9;
/** The wave's travel: one wavelength per this many ms — the
 * app's own wavy travel (components/wavy-progress.tsx WAVY_TRAVEL_MS). */
export const SHARE_VIDEO_WAVE_TRAVEL_MS = 1200;

/** A cubic-bezier easing's y at x (Newton + bisection fallback),
 * the same curve the native maker evaluates through Android's
 * PathInterpolator with the same control points. */
export function cubicBezierEasing(
  x: number,
  p1x: number,
  p1y: number,
  p2x: number,
  p2y: number,
): number {
  const cx = Math.min(1, Math.max(0, x));
  if (cx === 0 || cx === 1) return cx;
  const sampleX = (t: number) =>
    3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
  const sampleY = (t: number) =>
    3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  let t = cx;
  for (let i = 0; i < 8; i++) {
    const err = sampleX(t) - cx;
    if (Math.abs(err) < 1e-6) return sampleY(t);
    const d =
      3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
    if (t < 0 || t > 1) break;
  }
  let lo = 0;
  let hi = 1;
  t = cx;
  for (let i = 0; i < 24; i++) {
    if (sampleX(t) < cx) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return sampleY(t);
}

/** Material standard easing — cubic-bezier(0.2, 0, 0, 1), the
 * app's settle curve. */
export function materialStandardEasing(x: number): number {
  return cubicBezierEasing(x, 0.2, 0, 0, 1);
}

/** CSS ease-in-out — cubic-bezier(0.42, 0, 0.58, 1), the
 * drawing's breathing and sweep curve. */
export function easeInOutEasing(x: number): number {
  return cubicBezierEasing(x, 0.42, 0, 0.58, 1);
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** (a) The entrance settle for one element: faded and risen
 * before its delay, home at delay + duration. The rise is 14px
 * at the drawings' scale — 50px on the story canvas, 44 on the
 * square. */
export function shareVideoEntrance(
  tSec: number,
  delaySec: number,
  risePx: number,
): { opacity: number; translateY: number } {
  const p = clamp01((tSec - delaySec) / SHARE_VIDEO_ENTRANCE_DURATION_SEC);
  const e = materialStandardEasing(p);
  return { opacity: e, translateY: risePx * (1 - e) };
}

export function shareVideoEntranceRisePx(format: DevotionalShareCardFormat): number {
  return format === 'story' ? 50 : 44;
}

/** (b) The ghost numeral's drift: a few pixels, very slow, one
 * way across the whole devotional — (−50, +72) on the story
 * canvas (the v3 drawing's −14px, +20px at 300px wide), (−44,
 * +50) on the square. */
export function shareVideoGhostDrift(
  tSec: number,
  durationSec: number,
  format: DevotionalShareCardFormat,
): { dx: number; dy: number } {
  const p = durationSec > 0 ? clamp01(tSec / durationSec) : 0;
  // (+ 0 keeps a resting drift at +0 rather than −0.)
  return format === 'story' ? { dx: -50 * p + 0, dy: 72 * p } : { dx: -44 * p + 0, dy: 50 * p };
}

/** (c) The breathing disc's ring: swells to 1.22 and fades out
 * over the first half of the loop, then eases back to rest as
 * it fades in over the second — the drawing's keyframes (0%:
 * scale 1, opacity 0.7; 50%: scale 1.22, opacity 0; 100%:
 * scale 1, opacity 0.7). */
export function shareVideoBreathRing(tSec: number): { scale: number; opacity: number } {
  const p = ((tSec % SHARE_VIDEO_BREATH_PERIOD_SEC) + SHARE_VIDEO_BREATH_PERIOD_SEC) %
    SHARE_VIDEO_BREATH_PERIOD_SEC / SHARE_VIDEO_BREATH_PERIOD_SEC;
  if (p < 0.5) {
    const q = easeInOutEasing(p * 2);
    return { scale: 1 + 0.22 * q, opacity: 0.7 * (1 - q) };
  }
  const q = easeInOutEasing((p - 0.5) * 2);
  return { scale: 1.22 - 0.22 * q, opacity: 0.7 * q };
}

/** (d) The audio bar's progress: elapsed over the devotional's
 * FULL length, clamped — the played wave grows with the audio
 * itself, never with a preview clock. */
export function shareVideoProgress(elapsedSec: number, durationSec: number): number {
  if (!Number.isFinite(elapsedSec) || !Number.isFinite(durationSec) || durationSec <= 0) return 0;
  return clamp01(elapsedSec / durationSec);
}

/** (d) The wave's phase at t: one wavelength of travel per
 * SHARE_VIDEO_WAVE_TRAVEL_MS, linear — a full wavelength renders
 * identical to phase 0, so the travel is seamless. */
export function shareVideoWavePhasePx(tSec: number, wavelength: number): number {
  if (!Number.isFinite(tSec) || wavelength <= 0) return 0;
  const cycles = (tSec * 1000) / SHARE_VIDEO_WAVE_TRAVEL_MS;
  return (cycles - Math.floor(cycles)) * wavelength;
}

/** (e) The light sweep's band position: parked off the left edge
 * until 55% of its 9s cycle, crossing to off the right edge by
 * 85%, parked again after — the drawing's keyframes, in canvas
 * fractions (band 0.4333 wide, from −0.7333 to 1.4). */
export function shareVideoSweepX(tSec: number, canvasWidth: number): number {
  const cycle =
    (((tSec % SHARE_VIDEO_SWEEP_PERIOD_SEC) + SHARE_VIDEO_SWEEP_PERIOD_SEC) %
      SHARE_VIDEO_SWEEP_PERIOD_SEC) /
    SHARE_VIDEO_SWEEP_PERIOD_SEC;
  const from = -0.7333 * canvasWidth;
  const to = 1.4 * canvasWidth;
  if (cycle < 0.55) return from;
  if (cycle > 0.85) return to;
  const q = easeInOutEasing((cycle - 0.55) / 0.3);
  return from + (to - from) * q;
}

export function shareVideoSweepBandWidth(canvasWidth: number): number {
  return 0.4333 * canvasWidth;
}

// ─── The native spec ────────────────────────────────────────────────────────
// The one handoff to the maker: every number it draws by comes
// from the model above. Paths are plain filesystem paths (no
// file:// scheme) — MediaExtractor and the muxer read paths.

export interface DevotionalShareNativeSpec {
  format: DevotionalShareCardFormat;
  width: number;
  height: number;
  durationSec: number;
  outPath: string;
  audioPath: string | null;
  deep: string;
  kickerColor: string;
  paleColor: string;
  white: string;
  ghostAlpha: number;
  discFillAlpha: number;
  trackAlpha: number;
  sweepAlpha: number;
  kicker: string;
  title: string;
  durationLabel: string;
  brand: string;
  listenLine: string;
  ghostText: string;
  layout: DevotionalShareCardLayout;
  wave: DevotionalShareWaveModel | null;
  stillProgress: number;
  fps: number;
  entranceDurationSec: number;
  entranceDelaysSec: readonly number[];
  entranceRisePx: number;
  breathPeriodSec: number;
  sweepPeriodSec: number;
  waveTravelMs: number;
}

export function devotionalShareNativeSpec(args: {
  kind: DevotionalShareKind;
  devotional: Devotional;
  outPath: string;
  audioPath: string | null;
}): DevotionalShareNativeSpec {
  const format = shareKindFormat(args.kind) ?? 'square';
  const video = shareKindIsVideo(args.kind);
  const model = devotionalShareCardModel(args.devotional, format, video);
  return {
    format,
    width: model.width,
    height: model.height,
    durationSec: args.devotional.durationSec,
    outPath: args.outPath,
    audioPath: args.audioPath,
    deep: model.colors.deep,
    kickerColor: model.colors.kicker,
    paleColor: model.colors.pale,
    white: model.colors.white,
    ghostAlpha: 0.07,
    discFillAlpha: 0.14,
    trackAlpha: 0.22,
    sweepAlpha: 0.06,
    kicker: model.kicker,
    title: model.title,
    durationLabel: model.durationLabel,
    brand: model.brand,
    listenLine: model.listenLine,
    ghostText: model.ghostText,
    layout: model.layout,
    wave: model.wave,
    stillProgress: model.stillProgress,
    fps: SHARE_VIDEO_FPS,
    entranceDurationSec: SHARE_VIDEO_ENTRANCE_DURATION_SEC,
    entranceDelaysSec: SHARE_VIDEO_ENTRANCE_DELAYS_SEC,
    entranceRisePx: shareVideoEntranceRisePx(format),
    breathPeriodSec: SHARE_VIDEO_BREATH_PERIOD_SEC,
    sweepPeriodSec: SHARE_VIDEO_SWEEP_PERIOD_SEC,
    waveTravelMs: SHARE_VIDEO_WAVE_TRAVEL_MS,
  };
}

// ─── Generation + the share sheet ───────────────────────────────────────────
// The runtime doors, behind one deps surface in the Ten Stops
// idiom so tests can stand the whole room up with fakes. The
// defaults reach for the real modules lazily (require-guarded):
// a surface that is missing or misshapen reads as "not
// available", never a crash.

export interface DevotionalShareDeps {
  /** The app's cache directory (file:// URI), or null. */
  cacheDirectory: () => string | null;
  ensureDirectory: (uri: string) => Promise<void>;
  fileExists: (uri: string) => Promise<boolean>;
  /** The chapter's downloaded file as a URI, or null when the
   * file is not on this phone. */
  localAudioUri: (d: Devotional) => string | null;
  /** The native maker, or null where this build carries none. */
  nativeMaker: {
    renderCardPng: (spec: DevotionalShareNativeSpec) => Promise<void>;
    renderVideo: (
      spec: DevotionalShareNativeSpec,
      onProgress?: (done: number, total: number) => void,
    ) => Promise<void>;
    /** v539: whether a made MP4 actually carries its audio.
     * Optional on purpose: a maker without the probe leaves a
     * cached video trusted as it was before v539 — but the real
     * maker always carries it, and a video that fails the probe
     * is re-made rather than shared silent. */
    probeVideoAudio?: (path: string) => Promise<boolean>;
  } | null;
  /** Opens the system share sheet for one file. */
  shareFile: (uri: string, mimeType: string) => Promise<void>;
}

let shareDepsOverride: DevotionalShareDeps | null = null;

/** Test-only: substitute the doors the share flow sees. Call
 * with no argument (or null) to restore the real doors. */
export function setDevotionalShareDepsForTests(deps?: DevotionalShareDeps | null): void {
  shareDepsOverride = deps ?? null;
}

function stripFileScheme(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

function realShareDeps(): DevotionalShareDeps {
  return {
    cacheDirectory: () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const FileSystem = require('expo-file-system/legacy');
        return typeof FileSystem.cacheDirectory === 'string' ? FileSystem.cacheDirectory : null;
      } catch {
        return null;
      }
    },
    ensureDirectory: async (uri: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const FileSystem = require('expo-file-system/legacy');
      await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
    },
    fileExists: async (uri: string) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const FileSystem = require('expo-file-system/legacy');
        const info = await FileSystem.getInfoAsync(uri);
        return !!info?.exists;
      } catch {
        return false;
      }
    },
    localAudioUri: (d: Devotional) => devotionalLocalSource(d)?.uri ?? null,
    nativeMaker: (() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('../modules/expo-devotional-share/src/index');
        if (mod && typeof mod.renderShareCardPng === 'function' && typeof mod.renderShareVideo === 'function') {
          return {
            renderCardPng: (spec: DevotionalShareNativeSpec) => mod.renderShareCardPng(spec),
            renderVideo: (
              spec: DevotionalShareNativeSpec,
              onProgress?: (done: number, total: number) => void,
            ) => mod.renderShareVideo(spec, onProgress),
            probeVideoAudio:
              typeof mod.probeShareVideoAudio === 'function'
                ? (path: string) => mod.probeShareVideoAudio(path)
                : undefined,
          };
        }
      } catch {
        // No native maker in this build — the flow says so plainly.
      }
      return null;
    })(),
    shareFile: async (uri: string, mimeType: string) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sharing = require('expo-sharing') as typeof import('expo-sharing');
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Sharing is not available on this phone.');
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Share this devotional' });
    },
  };
}

function shareDeps(): DevotionalShareDeps {
  return shareDepsOverride ?? realShareDeps();
}

/** True when the Audio share can fire: the chapter's file is on
 * this phone (the player only plays downloaded chapter
 * devotionals, so in the player this is the standing case; the
 * button still checks rather than assumes). */
export function devotionalShareAudioAvailable(d: Devotional): boolean {
  return shareDeps().localAudioUri(d) != null;
}

/**
 * Generate one share artifact (if it needs generating) and open
 * the system share sheet with it. Resolves with the shared
 * file's URI. Every failure throws an Error whose message says
 * plainly what could not be done — the Share group shows it as
 * its error state; nothing here ever reports a success that did
 * not happen.
 *
 * onProgress (v539) hears a video render's frames done of its
 * total while it generates — the only generation long enough to
 * want a number. And a cached video is no longer trusted on its
 * existence alone: the maker's own audio probe must vouch for
 * it first, because a build before the probe could leave a
 * finished-looking silent MP4 in this cache (v538's device
 * run did exactly that). A video that fails the probe is
 * re-made on the spot; the fresh render proves its own audio
 * before it is allowed to exist.
 */
export async function generateAndShareDevotionalArtifact(
  kind: DevotionalShareKind,
  d: Devotional,
  onProgress?: (done: number, total: number) => void,
): Promise<{ uri: string }> {
  const deps = shareDeps();

  if (kind === 'audio') {
    const uri = deps.localAudioUri(d);
    if (!uri) throw new Error('This devotional is not on this phone yet.');
    await deps.shareFile(uri, shareArtifactMimeType(kind));
    return { uri };
  }

  const maker = deps.nativeMaker;
  if (!maker) {
    throw new Error('This build cannot make share pictures or videos.');
  }
  const cacheBase = deps.cacheDirectory();
  const outUri = shareArtifactCachePath(cacheBase, kind, d);
  if (!outUri || !cacheBase) {
    throw new Error('There is nowhere on this phone to make the share file.');
  }

  const audioUri = deps.localAudioUri(d);
  const spec = devotionalShareNativeSpec({
    kind,
    devotional: d,
    outPath: stripFileScheme(outUri),
    audioPath: audioUri ? stripFileScheme(audioUri) : null,
  });
  if (shareKindIsVideo(kind) && !spec.audioPath) {
    throw new Error('This devotional is not on this phone yet.');
  }

  let ready = await deps.fileExists(outUri);
  if (ready && shareKindIsVideo(kind) && maker.probeVideoAudio) {
    ready = await maker.probeVideoAudio(stripFileScheme(outUri)).catch(() => false);
  }
  if (!ready) {
    const dirUri = outUri.slice(0, outUri.lastIndexOf('/') + 1);
    await deps.ensureDirectory(dirUri);
    if (shareKindIsVideo(kind)) {
      await maker.renderVideo(spec, onProgress);
    } else {
      await maker.renderCardPng(spec);
    }
    if (!(await deps.fileExists(outUri))) {
      throw new Error('The share file could not be made.');
    }
  }

  await deps.shareFile(outUri, shareArtifactMimeType(kind));
  return { uri: outUri };
}
