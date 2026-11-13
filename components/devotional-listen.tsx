// ─── Devotional player screen (v230 → v293 → v497 → v499) ──────────────────
// v499 is the approved repair (mockup devotional-player-guideposts-v5,
// PLAYER GUIDEPOSTS V5 · NOV 11 — "Build it — page + transition, as
// demonstrated"), answering Jonathan's phone verdict on v497: the
// collapse washed to a blank salmon screen and popped back into the
// chapter, the page pushed everything to the top with the words
// hidden away, and the family wasn't red. Four parts:
//
// PAGE — the Guideposts composition: a header row (kicker left, the
// collapse chevron at the TOP RIGHT in a quiet tonal seat), the
// title, the chapter's big-idea line under it (his own sentence,
// only where a source carries one — lib/devotionals'
// devotionalBigIdea), a hero row pairing the chapter numeral (~76px)
// with a facts column ("{Book} {chapter}:1–{last} · Chapter {n} of
// {count} · {duration} · a reading of his commentary"), the wavy
// seek, ONE controls row (filled-tonal Stop pill at the left margin,
// the 64px primary play EXACTLY at the page's horizontal centre),
// the IN THIS CHAPTER guideposts where real timed movements exist
// (devotionalGuideposts — no chapter carries any, so for chapters
// the section is absent rather than invented; v506: the Ten Stops
// tour's transcript timings DO land, and its panel — headed
// THE TEN STOPS — lists the ten stops, each row a tap-to-seek
// door to that stop's first second), and the follow-along words
// flowing in the page's single scroll column — no fold, no
// expander.
//
// COLOURS — lib/devotional-player-theme.ts re-anchored on each
// book's ROYGBIV band hue, saturation held (Genesis, the drawn
// instance: primary #A8150C on ground #F6D0C8).
//
// COLLAPSE — the v5 demo's mechanism, ported: the route presents
// transparently over the chapter (app/devotional.tsx), which stays
// mounted and visible around the surface for the whole morph. ONE
// progress value (0 = full page, 1 = pill) drives the surface's
// bounds from full frame to the root pill's exact seat; the page
// content fades/travels out over p 0 → 0.45, the pill's face fades
// in over p 0.55 → 1, so at no point is the surface blank. A
// downward drag at the top of the page scrubs the value over
// 300px; release past 35% settles into the pill (~500ms, Material
// emphasized cubic-bezier(0.2, 0, 0, 1)). On settle the listen view
// raises the hand-off flag and THEN closes the route, so the root
// pill — same seat, same stops — simply is there: no pop, no
// chapter remount, no scroll jump. The chevron runs the same morph
// for non-gesture users; opening from the pill reverses it
// (lib/devotional-player's one-shot expand-morph flag). The
// follow-along and guideposts subtrees are memoised, so the morph
// never re-renders them frame by frame.
//
// STOP (his sequence, unchanged): the primary spreads from the
// Stop button across the whole surface (380ms), holds (250ms), the
// surface slides down and away (400ms) — and only then does the
// session clear (pause, rewind, session gone: the v293 semantics).
// After Stop, no session UI remains anywhere: the controller is
// idle, so the pill renders nothing and the doorway relights.
//
// Playback still lives in the shared controller
// (lib/devotional-player.ts), not in this screen: leaving the
// screen never unloads the player. The words on screen, where a
// transcript exists, follow the audio by PROPORTION
// (character-length-weighted — see lib/devotionals.ts; NOT
// word-sync, and no UI copy claims otherwise).
//
// v501: the same page serves a book-level Ten Stops tour
// (Devotional.bookLevel, lib/ten-stops.ts). Nothing about the tour
// is fabricated into chapter shape: the hero seat carries the
// BOOK's name, not a numeral; the facts say the whole book, ten
// stops, the real duration (devotionalFacts branches); the context
// line reads "{Book} · Ten Stops" (devotionalContextLine). Its
// audio is the downloaded local file.
//
// v508: the tours carry their transcripts (the follow-along the
// chapter narrations still honestly lack) — the TRANSCRIPT panel
// under the guideposts, segments grouped under their stops, the
// spoken segment lit, every segment a seek door. See
// TranscriptPanel below.
//
// v510: two fixes from Jonathan's phone (Nov 12, on v508). The
// transcript follow-along fought him: the camera yanked the page
// back down to the spoken segment while he was trying to scroll
// away, and it seated that segment hard against the top edge.
// Now the camera yields the moment he drags the page and stays
// his for DEVOTIONAL_FOLLOW_RESUME_MS after his scroll ends (a
// tap on a guidepost or a transcript line — a seek — re-engages
// it at once), and the active segment seats a third of the
// screen down from the top edge (followScrollTarget). And
// closing the page killed the audio outright: every close path
// now ends at the pill with the session untouched — Android
// back runs the same hand-off as the chevron instead of popping
// the route bare, the page content is untouchable while a
// collapse is in flight (mid-morph the content is faded out but
// was still tappable, so a stray tap on the invisible Stop seat
// could run the Stop sequence and clear the session the close
// was only supposed to minimise), and an interrupted settle
// into the pill still completes the close instead of stranding
// a frozen half-shrunk surface. Stop — and only Stop — still
// ends a session.
//
// v515: the EXPAND LAG (Jonathan's recording, Nov 12, on v512 —
// collapse now lands on the pill correctly, but tapping the pill
// to re-open hangs on a full screen of solid book colour for
// over a second before any player content paints). The cause:
// the listen view unmounts whole on collapse, so an expand is a
// from-scratch mount of the ENTIRE page in one synchronous first
// render — for a Ten Stops tour that is the transcript panel's
// ~300–500 segment Pressables, every one with its own layout
// callback, inside an unvirtualised ScrollView. The coloured
// surface (one view, driven by the UI-thread morph) is ready at
// once; the content tree behind it is still being built, so the
// first frames go to building, not to the page simply being
// there — the same failure family as the Pour fix ("the panel
// was being built twice from scratch on every open"). The fix
// phases the mount: the FIRST render carries only the light face
// — header, title, hero, seek, controls, the pill face — and the
// three heavy panels below the controls (guideposts, transcript,
// follow-along paragraphs) hydrate one tick later, after that
// first paint is on screen. The morph, the session, and every
// behaviour once the page is up are untouched; the panels arrive
// in a single commit a frame or two behind the face, below the
// fold line of the controls, instead of holding the whole page
// hostage. A side effect of the light first render: the expand
// morph's own start (gated on the reduce-motion answer) is no
// longer serialised behind the heavy build either.
//
// v519: the transcript's WEIGHT (Jonathan's recording, Nov 13,
// on v518 — with a tour playing, collapse/expand travel and
// especially scrolling the follow-along still drag). v515 fixed
// the expand's first paint; what remained was the panel itself:
// ~500 segment Pressables, each with its own layout callback,
// mounted at once inside the page's single ScrollView, plus a
// position tick's render scope — the guideposts memo was
// defeated every tick by a freshly-allocated movements array,
// the face re-rendered whole on every 250ms status update, and
// a segment boundary re-rendered every row in the panel. The
// cleanup is structural, behaviour-identical:
//  · the transcript mounts a WINDOW of its rows — around the
//    spoken segment and the reader's viewport, with overscan —
//    and the unmounted rest are carried by two spacer views
//    whose heights come from the panel's row-height model:
//    measured heights (cached by row position as rows mount)
//    over text-derived estimates, never a flat guess. The
//    spoken segment's row is ALWAYS in the window, and the
//    follow camera keeps seating off its MEASURED layout, so
//    scroll positions stay truthful as the window moves (the
//    mount-spreading family of the chapter page's old v403
//    slicing, kept here because the rows stay heavy: a
//    Pressable and a layout callback apiece).
//  · segment rows are memoised on their lit state, so a
//    segment boundary re-renders exactly the two rows whose
//    state changed — the one that lit and the one that went
//    out — and a tick inside a segment re-renders none of them.
//  · the tick's render path is narrowed to what moves: the
//    guideposts and facts are memoised at the source (their
//    helpers allocate fresh objects per call, which silently
//    broke the panels' memo), and the face, the controls row
//    and the pill face are memoised leaves whose props exclude
//    the position — a 250ms tick re-renders the seek bar and
//    the time labels, and nothing else that stands still.
//
// v520: the lag was STILL there (Jonathan's phone, Nov 13, on
// v519), and his diagnosis named the mechanism: "It might be
// because the player is trying to find the transcript spot."
// He was right in code. Even after v519's cleanup, the player
// ran continual transcript-position work on every path:
//  · a useEffect on the active segment fired an animated
//    scrollTo on EVERY segment boundary while follow was live;
//  · the seat correction in the segment layout callback
//    re-seated the camera whenever the spoken row (re)measured
//    — the window's own re-slices fed it fresh triggers;
//  · the window itself anchored on the VOICE while follow was
//    live, re-cutting as the playhead advanced (mount/unmount
//    churn and layout reports, forever);
//  · the v510 resume timer dragged the camera back to the
//    voice ~6s after the reader's own scroll ended;
//  · every seek door re-engaged all of the above at once.
// His design call, in his words: "Maybe it should just open
// and close, and you press the little pill to catch up in the
// transcript and THAT'S how it follows the transcript." So
// the automatic transcript camera is GONE, by his direction:
//  · playback ticks and segment boundaries issue NO scroll
//    and NO positioning work — the spoken segment still lights
//    (dress, not camera), and the scroll position belongs to
//    the reader;
//  · opening the player does no seat-to-active work — the
//    transcript opens at the top of its panel; collapsing
//    likewise does no transcript work;
//  · the window anchors on the reader's VIEWPORT alone — the
//    voice never re-slices it;
//  · Catch up is the ONLY follow: it stands whenever the
//    spoken segment is not seated within the reader's current
//    view, and a tap makes ONE snap — the seat target slices
//    the window to the spoken row, its real measurement seats
//    it a third down (followScrollTarget), exactly once —
//    after which playback moves on, the reader stays put,
//    and the pill returns when the voice leaves the view
//    again. A guidepost tap or a transcript line keeps its
//    deliberate seek-and-seat (the same one-shot seat, aimed
//    at the tapped stop's first segment), unchanged.
// The CHAPTER sessions' paragraph camera (v510's yield, the
// resume grace, the parked Catch up) is untouched — the audit
// found the same continual hunting there, reported to
// Jonathan, not changed in this build (his call was about
// the transcript).
//
// v522: v520 helped a little; the lag was still there
// (Jonathan's phone, Nov 13). He named the reference model
// himself — APPLE MUSIC LYRICS: "They aren't always on, but
// you can toggle them on, scroll through them, and follow
// along if you choose." And his hypothesis for the rest of
// the lag: "maybe having a transcript toggle would help?" —
// if the transcript is off, the player shouldn't be
// rendering OR processing it at all. So the transcript is
// now a toggled view with three states (the state lives in
// this view and resets on unmount — every open starts OFF):
//  · OFF — the state at every open. The transcript panel is
//    NOT MOUNTED AT ALL (no rows, no window, no offsets
//    model), and the position tick performs no transcript
//    computation either: the active-segment lookup that fed
//    the panel is gated off with it (see activeSegIdx
//    below). The player is header, guideposts, controls —
//    and the Transcript button. Zero transcript work.
//  · The Transcript button (in the controls row, at the
//    right margin opposite Stop) toggles the VIEW only:
//    OFF → ON in one press, ON → OFF in one press, from
//    either on-state. Its dress follows the view: mounted
//    wears the book family's primary fill, off wears the
//    quiet tonal seat Stop wears.
//  · ON LANDS FOLLOWING — the way Apple Music lands you on
//    the live line: the panel mounts, seats once to the
//    spoken segment, and follow engages: on segment
//    boundaries the camera seats the spoken segment a third
//    down and the window anchors on the voice.
//  · The reader's own swipe RELEASES follow (the drag
//    lifecycle, never the camera's own scrolls): following
//    disengages and STAYS off — no timer, no re-engagement —
//    the panel stays mounted where he left it, its window
//    re-anchored to his viewport, free scrolling at his own
//    pace. The spoken segment still lights (dress only).
//  · CATCH UP lives INSIDE the on state: the floating
//    capsule (v512's dress) stands only while the panel is
//    on, follow is released, and the spoken segment is out
//    of the reader's view — never in OFF, never while
//    following, so it is not always constantly there (his
//    objection to the old pill). A press seats to the
//    spoken segment AND re-engages follow; it then hides.
// Guidepost and transcript-line taps keep their v520 shape:
// seek + one deliberate seat when the panel is on, never
// engaging follow, and in OFF they never mount the panel.
// The chapter sessions are untouched entirely.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  activeParagraphIndex,
  devotionalBigIdea,
  devotionalContextLine,
  devotionalFacts,
  devotionalGuideposts,
  devotionalKey,
  formatClock,
  type Devotional,
  type DevotionalMovement,
} from '@/lib/devotionals';
import { devotionalAudioFor } from '@/lib/devotional-audio';
import { getTenStops } from '@/lib/ten-stops';
import {
  activeTenStopsTranscriptSegment,
  tenStopsTranscriptRows,
  type TenStopsTranscriptRow,
} from '@/lib/ten-stops-transcripts';
import { tenStopsLocalSource } from '@/lib/ten-stops-download';
import { loadChapterVerses } from '@/lib/bible-v205/verses';
import {
  consumeDevotionalExpandMorph,
  devotionalEnded,
  openDevotional,
  requestDevotionalPillHandoff,
  seekDevotional,
  setDevotionalPlayerViewOpen,
  stopDevotional,
  toggleDevotionalPlayback,
  useDevotionalPlayerState,
} from '@/lib/devotional-player';
import {
  DEVOTIONAL_COLLAPSE_CONTENT_OUT_END,
  DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX,
  DEVOTIONAL_COLLAPSE_PILL_IN_START,
  DEVOTIONAL_COLLAPSE_SETTLE_MS,
  DEVOTIONAL_COLLAPSE_THRESHOLD,
  DEVOTIONAL_COLLAPSE_TRAVEL_PX,
  DEVOTIONAL_STOP_EXIT_MS,
  DEVOTIONAL_STOP_HOLD_MS,
  DEVOTIONAL_STOP_SPREAD_MS,
  devotionalPlayerTheme,
} from '@/lib/devotional-player-theme';
import { useBiblePalette } from './bible-v205/palette';
import { useTabBarOccupiedHeight } from './app-tab-bar';
import { WavyProgress } from './wavy-progress';

const KEEP_AWAKE_TAG = 'devotional-listen';

/** The demo's settle curve — Material emphasized. */
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);

/** The pill's seat, shared with components/devotional-pill.tsx:
 * 14px sides, 66px tall, `tabBarHeight + 10` off the bottom. */
const PILL_SIDE = 14;
const PILL_HEIGHT = 66;

// ─── The follow-along camera (v510; v520: chapters only) ────────────────────
// How long the page stays the reader's after his own scrolling
// ends before the follow-along camera may move it again. A tap
// on a guidepost or a transcript line (a seek) re-engages the
// camera immediately — the grace period is only for hands-off
// reading, never a lockout.
// v520: this camera now serves ONLY the chapter sessions'
// paragraph follow-along (kept exactly as it was — see the
// header note). The transcript's camera is retired entirely:
// its one surviving seat is the deliberate one-shot below
// (Catch up, a guidepost, a transcript line), which rides
// followScrollTarget but never a timer and never a boundary.
export const DEVOTIONAL_FOLLOW_RESUME_MS = 6000;

/** The scroll offset that seats an element (at content offset
 * elementY) a third of the viewport below the top edge — v508's
 * seat pinned it 24px under the edge, which read as "too high"
 * on Jonathan's phone. Clamped at the top of the page. */
export function followScrollTarget(elementY: number, viewportHeight: number): number {
  return Math.max(0, Math.round(elementY - viewportHeight / 3));
}

// ─── The transcript window (v519) ───────────────────────────────────────────
// How much of the transcript stands mounted around the ground
// the reader and the voice are on: this many rows behind the
// anchor, this many ahead. A row is a header or a segment; at
// rest on a ~500-segment tour the mounted set is the anchor's
// neighbourhood — some fifty rows — not the whole panel.
export const TRANSCRIPT_WINDOW_BACK_ROWS = 24;
export const TRANSCRIPT_WINDOW_AHEAD_ROWS = 40;
/** How close the anchor may come to a standing window's edge
 *  before the window is re-cut around it — well inside the
 *  overscan, so each re-cut buys real travel: the voice walks
 *  many segments, and the parked reader scrolls many rows,
 *  between re-slices. */
export const TRANSCRIPT_WINDOW_HOLD_MARGIN_ROWS = 8;

export interface TranscriptWindowRange {
  start: number;
  end: number;
}

/**
 * The window the transcript must mount. v520: the window
 * answers to the READER alone — the rows the viewport is
 * showing, plus the overscan below — and the voice's advance
 * never re-slices it. The one exception is a deliberate seat
 * (anchorRow: Catch up, a guidepost, a transcript line): the
 * camera is about to move to that row, so the window is cut
 * around IT alone — a jump, not a span — and once the seat
 * lands, the viewport arrives there and the reader's anchor
 * takes over seamlessly. Hysteresis on the reader's anchor:
 * while the viewport stays inside the standing window with
 * the hold margin to spare on both sides, the window stands —
 * the reader's scroll re-slices nothing until the viewport
 * nears an edge or escapes it.
 * v522: while follow is ENGAGED (the transcript toggled on
 * and not yet released by the reader's swipe), anchorRow
 * carries the voice's row instead — the window anchors on
 * the spoken segment, the Apple Music landing. The moment
 * follow releases, the anchor returns to the reader alone.
 */
export function transcriptWindowRange(args: {
  rowCount: number;
  /** An anchor row position (v520: a deliberate seat target;
   *  v522: also the voice's row while follow is engaged), or
   *  null when no seat is in flight and follow is off — the
   *  window then belongs to the reader's viewport alone. */
  anchorRow: number | null;
  /** First / last row position intersecting the viewport, in
   *  panel coordinates; null while the viewport's place in the
   *  panel is unknown (the window then sits at the panel's
   *  head — the transcript opens at its top). */
  viewFirst: number | null;
  viewLast: number | null;
  current: TranscriptWindowRange | null;
}): TranscriptWindowRange {
  const { rowCount } = args;
  if (rowCount <= 0) return { start: 0, end: 0 };
  if (args.anchorRow != null) {
    const anchor = Math.min(Math.max(args.anchorRow, 0), rowCount - 1);
    return {
      start: Math.max(0, anchor - TRANSCRIPT_WINDOW_BACK_ROWS),
      end: Math.min(rowCount, anchor + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1),
    };
  }
  const lo = args.viewFirst ?? 0;
  const hi = args.viewLast ?? lo;
  const cur = args.current;
  if (cur && cur.start >= 0 && cur.end <= rowCount) {
    // The margin a side can actually demand: a window already
    // at the panel's edge has no room beyond it to ask for.
    const lowMargin = Math.min(TRANSCRIPT_WINDOW_HOLD_MARGIN_ROWS, cur.start);
    const highMargin = Math.min(TRANSCRIPT_WINDOW_HOLD_MARGIN_ROWS, rowCount - cur.end);
    if (lo >= cur.start + lowMargin && hi <= cur.end - 1 - highMargin) {
      return cur;
    }
  }
  return {
    start: Math.max(0, lo - TRANSCRIPT_WINDOW_BACK_ROWS),
    end: Math.min(rowCount, hi + TRANSCRIPT_WINDOW_AHEAD_ROWS + 1),
  };
}

/**
 * The standing estimate of a transcript row's height before it
 * has ever mounted — derived from the row itself (a segment's
 * own text length at the panel's measure, a header's two text
 * lines), and replaced by the row's measured height the moment
 * it mounts (the panel caches measurements by row position).
 * The spacers are only ever as wrong as this estimate, and only
 * until the reader's scrolling brings the real row on stage;
 * a deliberate seat never aims off an estimate either — it
 * slices the window to the target row and completes off that
 * row's measured layout when it lands (see requestSeat).
 */
export function transcriptRowEstimateHeight(row: TenStopsTranscriptRow, charsPerLine: number): number {
  // transcriptHead: marginTop 14 + marginBottom 6 around the
  // name line (~20px), plus the passage line (~18px) where one
  // rides.
  if (row.kind === 'header') return row.passage ? 58 : 40;
  // transcriptSeg: paddingVertical 8×2 + marginBottom 6 around
  // paraText lines at lineHeight 26.
  const lines = Math.max(1, Math.ceil(row.text.length / Math.max(8, charsPerLine)));
  return 22 + lines * 26;
}

/** The measure a segment's text wraps at, for a panel of the
 *  given width: the width less the panel's padding (16×2) and
 *  the segment's own padding and border (10×2 + 3), at ~8.2px
 *  a character of 17px text. */
export function transcriptCharsPerLine(panelWidth: number): number {
  return Math.max(12, Math.floor((panelWidth - 55) / 8.2));
}

/**
 * The row-height model's prefix sums: offsets[i] is row i's
 * top within the panel, offsets[rows.length] the panel's
 * total row height. Each row contributes its MEASURED height
 * where the cache holds one, its estimate where it does not —
 * the spacers that carry the unmounted rows are differences
 * of these sums, so the total is the same whether a row is
 * mounted or not.
 */
export function transcriptRowOffsets(
  rows: readonly TenStopsTranscriptRow[],
  measured: ReadonlyMap<number, number>,
  charsPerLine: number,
): number[] {
  const offsets = new Array<number>(rows.length + 1);
  offsets[0] = 0;
  for (let i = 0; i < rows.length; i++) {
    offsets[i + 1] = offsets[i] + (measured.get(i) ?? transcriptRowEstimateHeight(rows[i], charsPerLine));
  }
  return offsets;
}

// ─── The guideposts (IN THIS CHAPTER) ───────────────────────────────────────
// Rendered only when the session carries real timed movements
// (devotionalGuideposts) — for chapters that is still never, so
// there the panel stays a seat waiting for a timed source. v506:
// the Ten Stops tour's transcript timings landed, so a book-level
// session's panel lists its ten stops under THE TEN STOPS. Every
// row is a door: a tap seeks the narration to that movement's
// first second (the controller's own seek path — source-agnostic,
// so a tour seeks exactly as a chapter would). A movement's
// passage, where the source names one, rides under its title.
// Memoised: the morph never re-renders it.
const GuidepostsPanel = memo(function GuidepostsPanel(props: {
  movements: DevotionalMovement[];
  heading: string;
  panel: string;
  primary: string;
  ink: string;
  inkSoft: string;
  accent: string;
  onSeek: (sec: number) => void;
}) {
  return (
    <View style={[styles.panel, { backgroundColor: props.panel }]}>
      <Text style={[styles.panelTitle, { color: props.primary }]}>{props.heading}</Text>
      {props.movements.map((m, i) => (
        <View key={`${m.startSec}-${m.title}`}>
          <Pressable
            style={styles.guideRow}
            onPress={() => props.onSeek(m.startSec)}
            accessibilityRole="button"
            accessibilityLabel={`Play from ${m.title}`}
          >
            <View style={styles.guideTextCol}>
              <Text style={[styles.guideName, { color: props.ink }]}>{m.title}</Text>
              {m.passage ? (
                <Text style={[styles.guidePassage, { color: props.inkSoft }]}>{m.passage}</Text>
              ) : null}
            </View>
            <Text style={[styles.guideTime, { color: props.primary }]}>{formatClock(m.startSec)}</Text>
          </Pressable>
          {i < props.movements.length - 1 ? (
            <View style={[styles.guideDivider, { backgroundColor: props.accent }]} />
          ) : null}
        </View>
      ))}
    </View>
  );
});

// ─── The transcript follow-along (v508, Ten Stops sessions only) ────────────
// Owed to Jonathan explicitly: the transcript TEXT in the player,
// not just the guidepost timings the transcript produced. A tour
// session carries its own word-timed transcript at segment level
// (Devotional.transcriptSegments); under the guideposts, this
// panel lays the segments out grouped under their stop (the
// pre-Stop-1 words under an Introduction header), each segment a
// tap-to-seek door, the segment being spoken lit in the book's
// washed seat — the follow-along's own active-paragraph dress,
// no new vocabulary. Chapter sessions carry no transcript, so
// the section renders nowhere for them.
// v519: the panel mounts a window of these rows, not all of
// them (see the header note and transcriptWindowRange above);
// what is written here — the grouping, the dress, the doors —
// is unchanged for every row the window carries.
// v520: the page's scroll NO LONGER follows the voice here
// (see the header note): the spoken segment still lights, but
// the panel itself reports only whether that segment stands
// within the reader's current view (onSpokenInViewChange) —
// the fact the Catch up pill stands on — and the window is
// cut around the reader's viewport, or around a deliberate
// seat target while one is in flight (seatSeg).
// v522: the panel itself is now toggled (see the header
// note) — it mounts only while the transcript view is on,
// and while follow is engaged seatSeg carries the spoken
// segment, so the window opens around the voice and travels
// with it until the reader's swipe releases the follow.
// ─── v519: a transcript row, memoised on what it wears ──────
// A segment boundary changes exactly two rows' dress — the
// one that lit and the one that went out — so the row renders
// from its lit STATE ('active' | 'done' | 'next', the same
// three the dress has always read off the index comparison)
// and nothing else that moves. Its layout report carries its
// row position with it, through one stable callback the panel
// owns, so the memo is never broken by a fresh closure.
type TranscriptRowLayoutReport = (
  pos: number,
  segIndex: number,
  y: number,
  height: number | undefined,
) => void;

const TranscriptHeaderRow = memo(function TranscriptHeaderRow(props: {
  row: Extract<TenStopsTranscriptRow, { kind: 'header' }>;
  pos: number;
  primary: string;
  inkSoft: string;
  reportLayout: TranscriptRowLayoutReport;
}) {
  const { row } = props;
  return (
    <View
      style={styles.transcriptHead}
      onLayout={(e) =>
        props.reportLayout(props.pos, -1, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
      }
    >
      <Text style={[styles.guideName, { color: props.primary }]}>{row.label}</Text>
      {row.passage ? (
        <Text style={[styles.guidePassage, { color: props.inkSoft }]}>{row.passage}</Text>
      ) : null}
    </View>
  );
});

const TranscriptSegmentRow = memo(function TranscriptSegmentRow(props: {
  row: Extract<TenStopsTranscriptRow, { kind: 'segment' }>;
  pos: number;
  state: 'active' | 'done' | 'next';
  primary: string;
  ink: string;
  inkSoft: string;
  stopSeat: string;
  onSeek: (sec: number) => void;
  reportLayout: TranscriptRowLayoutReport;
}) {
  const { row, state } = props;
  return (
    <Pressable
      onLayout={(e) =>
        props.reportLayout(props.pos, row.index, e.nativeEvent.layout.y, e.nativeEvent.layout.height)
      }
      style={[
        styles.transcriptSeg,
        state === 'active'
          ? { backgroundColor: props.stopSeat, borderLeftColor: props.primary }
          : { borderLeftColor: 'transparent' },
      ]}
      onPress={() => props.onSeek(row.startSec)}
      accessibilityRole="button"
      accessibilityLabel={`Play from ${formatClock(row.startSec)}`}
    >
      <Text
        style={[
          styles.paraText,
          {
            color: state === 'done' ? props.inkSoft : props.ink,
            opacity: state === 'next' ? 0.75 : 1,
          },
        ]}
      >
        {row.text}
      </Text>
    </Pressable>
  );
});

const TranscriptPanel = memo(function TranscriptPanel(props: {
  rows: TenStopsTranscriptRow[];
  activeIdx: number;
  panel: string;
  primary: string;
  ink: string;
  inkSoft: string;
  stopSeat: string;
  onSeek: (sec: number) => void;
  onSegLayout: (index: number, y: number) => void;
  onPanelLayout: (y: number) => void;
  /** v519: the page's scroll offset (a coarse hint — it moves
   *  in steps, not per event) and viewport height, so the
   *  window can follow the reader. v520: the window anchors
   *  on the reader's viewport ALONE (transcriptWindowRange) —
   *  the voice never re-slices it; seatSeg is the one
   *  exception, a deliberate seat target whose row the window
   *  must mount so its measurement can complete the seat. */
  scrollY: number;
  viewportHeight: number;
  /** v520: the segment a deliberate seat is aimed at (Catch
   *  up's spoken segment, a guidepost's first segment), or
   *  null when no seat is in flight. v522: while follow is
   *  engaged the parent passes the SPOKEN segment here
   *  instead — the seat target and the follow anchor are the
   *  same seat (transcriptWindowRange's anchorRow). */
  seatSeg: number | null;
  /** v520: reports whether the spoken segment stands within
   *  the reader's current view — the Catch up pill's standing
   *  fact. Fires only when the fact changes. */
  onSpokenInViewChange: (inView: boolean) => void;
}) {
  const { rows, activeIdx } = props;

  // Segment index → its row position (headers interleave).
  const segRowPos = useMemo(() => {
    const map = new Map<number, number>();
    rows.forEach((row, pos) => {
      if (row.kind === 'segment') map.set(row.index, pos);
    });
    return map;
  }, [rows]);
  const seatRow =
    props.seatSeg != null && props.seatSeg >= 0 ? (segRowPos.get(props.seatSeg) ?? null) : null;

  // The row-height model: measured heights cached by row
  // position as rows mount, standing over the text-derived
  // estimates (transcriptRowEstimateHeight). Offsets are the
  // model's prefix sums — the spacers below are read straight
  // off them, so the panel's total height stays the sum of its
  // rows whether a given row is mounted or not.
  const heightsRef = useRef(new Map<number, number>());
  const [heightsVersion, setHeightsVersion] = useState(0);
  const panelBoxRef = useRef({ top: 0, width: 350 });
  const [boxVersion, setBoxVersion] = useState(0);
  const charsPerLine = transcriptCharsPerLine(panelBoxRef.current.width);
  const { offsets, totalHeight } = useMemo(() => {
    const offsets = transcriptRowOffsets(rows, heightsRef.current, charsPerLine);
    return { offsets, totalHeight: offsets[rows.length] };
    // heightsVersion / boxVersion are the model's change
    // counters — the cache and the measure live in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, heightsVersion, boxVersion]);

  // Which rows the reader's viewport is on, in panel
  // coordinates: the page's scroll offset less the panel's own
  // seat in the page, a viewport tall.
  const viewRows = useMemo(() => {
    const vTop = props.scrollY - panelBoxRef.current.top;
    const vBottom = vTop + props.viewportHeight;
    let first: number | null = null;
    let last: number | null = null;
    for (let i = 0; i < rows.length; i++) {
      if (offsets[i + 1] > vTop && offsets[i] < vBottom) {
        if (first === null) first = i;
        last = i;
      }
    }
    return { first, last };
    // boxVersion: the panel's seat enters the math.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offsets, props.scrollY, props.viewportHeight, rows.length, boxVersion]);

  // v520: the window opens at the panel's head (no anchor, no
  // viewport known yet) and afterwards belongs to the reader's
  // viewport — re-cut only when the viewport nears an edge, or
  // jumped to a deliberate seat target while one is in flight.
  // The playhead is NOT an input: a tick never re-slices.
  // v522: the panel mounts only when toggled on, and it lands
  // FOLLOWING — seatSeg carries the spoken segment from the
  // first derivation, so the window opens around the voice;
  // once the reader's swipe releases follow, seatSeg clears
  // and the viewport anchor above takes over again.
  const [win, setWin] = useState<TranscriptWindowRange>(() =>
    transcriptWindowRange({ rowCount: rows.length, anchorRow: null, viewFirst: null, viewLast: null, current: null }),
  );
  useEffect(() => {
    setWin((cur) => {
      const next = transcriptWindowRange({
        rowCount: rows.length,
        anchorRow: seatRow,
        viewFirst: viewRows.first,
        viewLast: viewRows.last,
        current: cur,
      });
      // A seat in flight re-derives the same cut on every
      // scroll step — keep the standing object when the cut
      // is unchanged, so the derivation costs no re-render.
      return next.start === cur.start && next.end === cur.end ? cur : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length, seatRow, viewRows]);

  // v520: is the spoken segment seated within the reader's
  // current view? Read off the same viewport rows the window
  // anchors on (the offsets model's word for where the reader
  // is). Before the first segment there is nothing to catch
  // up TO — that reads as in view, so no pill nags at the
  // tour's head. Reported on change only.
  const spokenRow = activeIdx >= 0 ? (segRowPos.get(activeIdx) ?? null) : null;
  const spokenInView =
    spokenRow == null ||
    (viewRows.first != null && spokenRow >= viewRows.first && spokenRow <= (viewRows.last ?? viewRows.first));
  const lastInViewRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (lastInViewRef.current !== spokenInView) {
      lastInViewRef.current = spokenInView;
      props.onSpokenInViewChange(spokenInView);
    }
    // onSpokenInViewChange is the parent's stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spokenInView]);

  const reportLayout = useCallback<TranscriptRowLayoutReport>(
    (pos, segIndex, y, height) => {
      if (segIndex >= 0 && typeof y === 'number') props.onSegLayout(segIndex, y);
      if (typeof height === 'number' && height > 0) {
        const prev = heightsRef.current.get(pos);
        if (prev === undefined || Math.abs(prev - height) >= 1) {
          heightsRef.current.set(pos, height);
          setHeightsVersion((v) => v + 1);
        }
      }
    },
    // onSegLayout is the parent's stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.onSegLayout],
  );

  const handlePanelLayout = useCallback(
    (e: { nativeEvent: { layout: { y: number; width: number } } }) => {
      const { y, width } = e.nativeEvent.layout;
      props.onPanelLayout(y);
      const widthChanged =
        typeof width === 'number' && Math.abs(width - panelBoxRef.current.width) >= 8;
      panelBoxRef.current = {
        top: y,
        width: typeof width === 'number' ? width : panelBoxRef.current.width,
      };
      if (widthChanged) setBoxVersion((v) => v + 1);
    },
    // onPanelLayout is the parent's stable callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.onPanelLayout],
  );

  return (
    <View style={[styles.panel, { backgroundColor: props.panel }]} onLayout={handlePanelLayout}>
      <Text style={[styles.panelTitle, { color: props.primary }]}>TRANSCRIPT</Text>
      {win.start > 0 ? (
        <View testID="transcript-spacer-top" style={{ height: offsets[win.start] }} />
      ) : null}
      {rows.slice(win.start, win.end).map((row, k) => {
        const pos = win.start + k;
        return row.kind === 'header' ? (
          <TranscriptHeaderRow
            key={`h-${pos}`}
            row={row}
            pos={pos}
            primary={props.primary}
            inkSoft={props.inkSoft}
            reportLayout={reportLayout}
          />
        ) : (
          <TranscriptSegmentRow
            key={`s-${row.index}`}
            row={row}
            pos={pos}
            state={row.index === activeIdx ? 'active' : row.index < activeIdx ? 'done' : 'next'}
            primary={props.primary}
            ink={props.ink}
            inkSoft={props.inkSoft}
            stopSeat={props.stopSeat}
            onSeek={props.onSeek}
            reportLayout={reportLayout}
          />
        );
      })}
      {win.end < rows.length ? (
        <View testID="transcript-spacer-bottom" style={{ height: totalHeight - offsets[win.end] }} />
      ) : null}
    </View>
  );
});

// ─── The follow-along words ─────────────────────────────────────────────────
// The paragraphs in the page's single scroll column — no fold, no
// expander, nothing hidden behind a button. Memoised on its inputs
// (paragraphs, active index, the four stops it wears) so neither
// the collapse morph nor a playback tick re-renders the words.
// v519: a follow-along paragraph, memoised on its state the
// same way the transcript's rows are — a paragraph boundary
// re-renders the two paragraphs whose dress changed, not the
// whole column.
const FollowPara = memo(function FollowPara(props: {
  text: string;
  index: number;
  state: 'active' | 'done' | 'next';
  stopSeat: string;
  primary: string;
  ink: string;
  inkSoft: string;
  onParaLayout: (index: number, y: number) => void;
}) {
  const { state } = props;
  return (
    <View
      onLayout={(e) => props.onParaLayout(props.index, e.nativeEvent.layout.y)}
      style={[
        styles.para,
        state === 'active'
          ? { backgroundColor: props.stopSeat, borderLeftColor: props.primary }
          : { borderLeftColor: 'transparent' },
      ]}
    >
      <Text
        style={[
          styles.paraText,
          { color: state === 'done' ? props.inkSoft : props.ink, opacity: state === 'next' ? 0.75 : 1 },
        ]}
      >
        {props.text}
      </Text>
    </View>
  );
});

const FollowAlong = memo(function FollowAlong(props: {
  paragraphs: readonly string[];
  activeIdx: number;
  stopSeat: string;
  primary: string;
  ink: string;
  inkSoft: string;
  onParaLayout: (index: number, y: number) => void;
}) {
  const { paragraphs, activeIdx } = props;
  if (paragraphs.length === 0) return null;
  return (
    <View style={styles.follow}>
      {paragraphs.map((text, i) => (
        <FollowPara
          key={i}
          text={text}
          index={i}
          state={i === activeIdx ? 'active' : i < activeIdx ? 'done' : 'next'}
          stopSeat={props.stopSeat}
          primary={props.primary}
          ink={props.ink}
          inkSoft={props.inkSoft}
          onParaLayout={props.onParaLayout}
        />
      ))}
      <Text style={[styles.foot, { color: props.inkSoft }]}>
        The words follow the reading by proportion — listen, and read along.
      </Text>
    </View>
  );
});

// ─── v519: the page's still parts, memoised ─────────────────
// The face (header, title, big idea, hero), the controls row
// and the pill face wear nothing the position moves — their
// props change only when the session, the facts or play state
// change — so a position tick's render passes over them. What
// a tick does move (the seek bar, the time labels) stays in
// the parent's own JSX, between the face and the controls.
const PlayerFace = memo(function PlayerFace(props: {
  contextLine: string;
  title: string;
  bigIdea: string | null;
  bookLevel: boolean;
  book: string;
  chapter: number;
  facts: { range: string | null; chapterLine: string; durationLine: string };
  primary: string;
  ink: string;
  inkSoft: string;
  accent: string;
  stopSeat: string;
  onMinimize: () => void;
}) {
  return (
    <>
      {/* The header row: kicker left, the collapse chevron at
          the top right in its quiet tonal seat — it runs the
          same morph as the drag. */}
      <View style={styles.headerRow}>
        <Text style={[styles.kicker, { color: props.primary }]}>{props.contextLine}</Text>
        <Pressable
          onPress={props.onMinimize}
          hitSlop={10}
          style={[styles.chevronBtn, { backgroundColor: props.stopSeat }]}
          accessibilityLabel="Minimize player"
        >
          <MaterialIcons name="keyboard-arrow-down" size={18} color={props.accent} />
        </Pressable>
      </View>

      <Text style={[styles.title, { color: props.ink }]}>{props.title}</Text>

      {/* The chapter's big-idea sentence, in his own words —
          only where a source carries one. */}
      {props.bigIdea ? (
        <Text style={[styles.bigIdea, { color: props.accent }]}>“{props.bigIdea}”</Text>
      ) : null}

      {/* The hero row: the numeral, and beside it the facts.
          A book-level tour (v501) has no numeral to show — the
          BOOK's name takes the hero seat instead, set smaller
          so a word fits where a number stood. */}
      <View style={styles.heroRow}>
        <Text
          style={[
            styles.numeral,
            { color: props.primary },
            props.bookLevel ? styles.numeralBook : null,
          ]}
        >
          {props.bookLevel ? props.book : props.chapter}
        </Text>
        <View style={styles.facts}>
          {props.facts.range ? (
            <Text style={[styles.factStrong, { color: props.ink }]}>{props.facts.range}</Text>
          ) : null}
          <Text style={[styles.fact, { color: props.inkSoft }]}>{props.facts.chapterLine}</Text>
          <Text style={[styles.fact, { color: props.inkSoft }]}>{props.facts.durationLine}</Text>
        </View>
      </View>
    </>
  );
});

const ControlsRow = memo(function ControlsRow(props: {
  playing: boolean;
  ended: boolean;
  primary: string;
  stopSeat: string;
  accent: string;
  stopBtnRef: React.RefObject<any>;
  onStop: () => void;
  onToggle: () => void;
  /** v522: the Transcript toggle (transcript sessions only —
   *  null for a chapter, which has no transcript to toggle).
   *  transcriptOn is the VIEW's state: the chip wears the
   *  book family's primary fill while the panel stands and
   *  the quiet tonal seat while it is off. */
  transcriptOn: boolean;
  onToggleTranscript: (() => void) | null;
}) {
  return (
    <View style={styles.controls}>
      <Pressable
        ref={props.stopBtnRef}
        onPress={props.onStop}
        style={[styles.stopBtn, { backgroundColor: props.stopSeat }]}
        accessibilityLabel="Stop"
      >
        <MaterialIcons name="stop" size={14} color={props.accent} />
        <Text style={[styles.stopText, { color: props.accent }]}>Stop</Text>
      </Pressable>
      {/* v522: the Transcript toggle — a control in the page,
          in the controls row at the right margin opposite
          Stop (Apple Music's lyrics button, in this page's
          own pill vocabulary: the Stop pill's seat and shape,
          the play button's fill while on). It toggles the
          transcript VIEW and nothing else. */}
      {props.onToggleTranscript ? (
        <Pressable
          onPress={props.onToggleTranscript}
          style={[
            styles.transcriptBtn,
            { backgroundColor: props.transcriptOn ? props.primary : props.stopSeat },
          ]}
          accessibilityLabel="Transcript"
          accessibilityState={{ selected: props.transcriptOn }}
        >
          <MaterialIcons
            name="subtitles"
            size={15}
            color={props.transcriptOn ? '#FFFFFF' : props.accent}
          />
          <Text
            style={[
              styles.transcriptText,
              { color: props.transcriptOn ? '#FFFFFF' : props.accent },
            ]}
          >
            Transcript
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={props.onToggle}
        style={[styles.playBtn, { backgroundColor: props.primary, shadowColor: props.primary }]}
        accessibilityLabel={props.playing ? 'Pause' : props.ended ? 'Play again' : 'Play'}
      >
        <MaterialIcons
          name={props.playing ? 'pause' : props.ended ? 'replay' : 'play-arrow'}
          size={28}
          color="#FFFFFF"
        />
      </Pressable>
    </View>
  );
});

const PillFace = memo(function PillFace(props: {
  playing: boolean;
  title: string;
  contextLine: string;
  primary: string;
  animatedStyle: React.ComponentProps<typeof Animated.View>['style'];
}) {
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.pillFace, { backgroundColor: props.primary }, props.animatedStyle]}
    >
      <View style={styles.pillDisc}>
        <MaterialIcons name={props.playing ? 'pause' : 'play-arrow'} size={20} color={props.primary} />
      </View>
      <View style={styles.pillTxt}>
        <Text style={styles.pillTitle} numberOfLines={1}>
          {props.title}
        </Text>
        <Text style={styles.pillCtx} numberOfLines={1}>
          {props.contextLine}
        </Text>
      </View>
      <View style={styles.pillSeat}>
        <MaterialIcons name="stop" size={15} color="rgba(255,255,255,0.88)" />
      </View>
      <View style={styles.pillSeat}>
        <MaterialIcons name="keyboard-arrow-up" size={19} color="rgba(255,255,255,0.88)" />
      </View>
    </Animated.View>
  );
});

export function DevotionalListenView(props: { devotional: Devotional; onBack: () => void }) {
  const { devotional } = props;
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const playerState = useDevotionalPlayerState();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const tabBarHeight = useTabBarOccupiedHeight();
  const theme = devotionalPlayerTheme(devotional.book, palette.isDark);

  const onBackRef = useRef(props.onBack);
  onBackRef.current = props.onBack;

  // Load this devotional into the shared player. A different
  // devotional replaces the source and plays; the same one (a reopen
  // from the pill) is left exactly as it is. The source is the
  // caller's resolver (the controller stays source-agnostic): the
  // bundled asset for a chapter's devotional, or — for a book-level
  // Ten Stops tour (v501) — the downloaded local file, resolved only
  // when a disk check has found it complete (tenStopsLocalSource).
  const tenStopsEntry = devotional.bookLevel ? getTenStops(devotional.book) : null;

  // v512: register this view's openness with the controller.
  // The pill renders from that fact (a live session and no open
  // player view), so the cleanup below — which runs on EVERY way
  // this view can close: chevron, Android back, drag-collapse,
  // an interrupted gesture, a bare route pop by any path — is
  // what stands the pill back up, with no dependence on the
  // morph completing, on a hand-off flag, or on the router's
  // pathname catching up.
  useEffect(() => {
    setDevotionalPlayerViewOpen(true);
    return () => {
      setDevotionalPlayerViewOpen(false);
    };
  }, []);

  useEffect(() => {
    openDevotional(
      devotional,
      devotional.bookLevel
        ? tenStopsEntry
          ? tenStopsLocalSource(tenStopsEntry)
          : null
        : devotionalAudioFor(devotional.book, devotional.chapter),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devotional]);

  const mine =
    playerState.devotional &&
    devotionalKey(playerState.devotional.book, playerState.devotional.chapter) ===
      devotionalKey(devotional.book, devotional.chapter);
  const playing = mine ? playerState.playing : false;
  const duration = mine && playerState.durationSec > 0 ? playerState.durationSec : devotional.durationSec;
  const position = mine ? Math.min(playerState.positionSec, duration) : 0;
  const ended = mine ? devotionalEnded(playerState) : false;
  const activeIdx = activeParagraphIndex(position, duration, devotional.paragraphs);

  // The page's information lines, from real sources only (see
  // lib/devotionals): the big-idea line and the guideposts are
  // null on every shipped entry today, and the page composes
  // without them; the facts' verse range lands when the chapter's
  // verses do (the app's own Bible-data path — the chapter the
  // reader came from has them cached).
  const bigIdea = devotionalBigIdea(devotional);
  // v519: memoised — devotionalGuideposts ALLOCATES a fresh
  // movements array on every call, so reading it bare in the
  // render handed GuidepostsPanel (and the transcript rows'
  // grouping) a new prop identity on every position tick and
  // silently defeated their memo. The derivation is a pure
  // function of the session's entry; it now runs per session.
  const guideposts = useMemo(() => devotionalGuideposts(devotional), [devotional]);
  // v508: the tour's transcript follow-along — the session's own
  // segments grouped under their stops, and the segment the
  // position is inside. Book-level sessions only (chapter
  // entries carry no transcriptSegments, so this stays null and
  // the section renders nowhere for them).
  const transcriptRows = useMemo(
    () =>
      devotional.bookLevel && devotional.transcriptSegments?.length && guideposts
        ? tenStopsTranscriptRows(devotional.transcriptSegments, guideposts)
        : null,
    [devotional, guideposts],
  );
  // ── v522: the transcript view's state (Apple Music lyrics) ──
  // 'off' at every open. The Transcript button toggles the
  // view; landing on engages follow ('following'); the
  // reader's own swipe releases it ('released'), and nothing
  // but the Catch up capsule re-engages it. The ref is the
  // logic's source of truth (the callbacks and effects below
  // read it); the state is its React mirror for the render.
  // Both live and die with this view — a collapse unmounts
  // it whole — so every open starts off. Nothing persists.
  const transcriptViewRef = useRef<'off' | 'following' | 'released'>('off');
  const [transcriptView, setTranscriptView] = useState<'off' | 'following' | 'released'>('off');
  const positionRef = useRef(position);
  positionRef.current = position;

  // v522: in OFF the tick does NO transcript work. The
  // active-segment lookup is the per-tick transcript
  // computation — a scan of the session's segments on every
  // render the position drives — and it exists only to feed
  // the panel (its lit dress, its window anchor, its seats).
  // With the view off there is no panel to feed: the lookup
  // is gated off with it, and the index reads -1 (nothing is
  // seated anywhere) until the view turns on.
  const activeSegIdx =
    transcriptRows && transcriptView !== 'off'
      ? activeTenStopsTranscriptSegment(devotional.transcriptSegments!, position)
      : -1;

  // ── v515: the heavy panels hydrate after the first paint ────
  // The first render of this view is the light face only (see
  // the header note): the guideposts, the transcript, and the
  // follow-along paragraphs — the subtrees whose from-scratch
  // build held the expanded surface blank on Jonathan's phone —
  // mount one tick later, in a single commit, once the face is
  // on screen. Their data (rows, movements, active indices) is
  // computed on the first render exactly as before; only their
  // MOUNT waits. The follow camera's layout seats (segY / paraY)
  // populate when the panels land, and its effects already guard
  // on a seat existing, so the brief window behaves exactly as
  // the same window did while layout lagged the old first mount.
  const [panelsReady, setPanelsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPanelsReady(true), 0);
    return () => clearTimeout(t);
  }, []);
  const [lastVerse, setLastVerse] = useState<number | null>(null);
  useEffect(() => {
    // A book-level tour has no chapter to load verses for — its
    // facts never carry a verse range (devotionalFacts branches).
    if (devotional.bookLevel) return;
    let live = true;
    loadChapterVerses(devotional.book, devotional.chapter)
      .then((verses) => {
        if (live && verses.length) setLastVerse(verses[verses.length - 1].verse);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [devotional.book, devotional.chapter, devotional.bookLevel]);
  // v519: memoised like the guideposts — devotionalFacts
  // allocates per call, and the face that wears them is a
  // memoised leaf now (PlayerFace below).
  const facts = useMemo(
    () => devotionalFacts(devotional, lastVerse, duration),
    [devotional, lastVerse, duration],
  );

  // Reduce motion (the codebase's AccessibilityInfo seat): the
  // morph and the stop sequence jump straight to their end states.
  const reducedMotionRef = useRef(false);
  const [reduceMotionKnown, setReduceMotionKnown] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (live) {
          reducedMotionRef.current = reduced;
          setReduceMotionKnown(true);
        }
      })
      .catch(() => {
        if (live) setReduceMotionKnown(true);
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduced) => {
      reducedMotionRef.current = reduced;
    });
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);
  const settleMs = () => (reducedMotionRef.current ? 0 : DEVOTIONAL_COLLAPSE_SETTLE_MS);

  // Keep the screen awake while listening; release on pause/finish.
  useEffect(() => {
    if (playing) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    }
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [playing]);

  // The chapter camera's seat cache: paragraph offsets within
  // the page (the v510 follow-along for chapter sessions).
  const scrollRef = useRef<ScrollView>(null);
  // v519: a coarse scroll hint for the transcript window —
  // the state moves only when the page has travelled a real
  // step since the last one the panel heard about, so a scroll
  // does not re-render the page per event (the ScrollView's
  // own throttle is 64ms; this is the state's).
  const [scrollHint, setScrollHint] = useState(0);
  const scrollHintRef = useRef(0);
  const screenHRef = useRef(screenH);
  screenHRef.current = screenH;
  const paraY = useRef<number[]>([]);
  const trackWidth = useRef(0);
  const scrollTopRef = useRef(true);
  const handleParaLayout = useCallback((index: number, y: number) => {
    paraY.current[index] = y;
  }, []);

  // ── v520: the transcript's seat — a deliberate one-shot ──
  // Segment offsets are measured within the transcript panel,
  // the panel's own offset within the page — together they are
  // a seat. A seat is requested by a deliberate act: Catch
  // up (the spoken segment), a guidepost tap, a transcript
  // line, the seek bar (the tapped stop's / point's segment).
  // If the target row has already measured, the seat fires at
  // once off that measurement; if it has not (its row is
  // outside the window), the request arms: seatSeg slices the
  // window to the row, and the layout callback below completes
  // the seat — exactly one scroll — when the measurement
  // lands. After a deliberate seat, nothing keeps following.
  // ── v522: the one standing exception ──
  // While follow is ENGAGED (the transcript toggled on and
  // not yet released by the reader's swipe), segment
  // boundaries request this same seat for the spoken segment
  // — that IS the follow. The engagement is the reader's own
  // switch, never a default: it begins only at the toggle-on
  // landing or a Catch up press, and it ends at his swipe or
  // the toggle off. See the transitions below.
  const segY = useRef<number[]>([]);
  const transcriptTop = useRef(0);
  const pendingSeatSegRef = useRef<number | null>(null);
  const [seatSeg, setSeatSeg] = useState<number | null>(null);
  // v520: whether the spoken segment stands within the
  // reader's current view (reported by the panel) — the Catch
  // up pill's standing fact for a transcript session. Assumed
  // in view until the panel says otherwise, so the pill never
  // flashes on open.
  // v522: the panel reports only while it stands (the view
  // on); the fact now gates the capsule inside the
  // on-and-released state (see the render below).
  const [spokenInView, setSpokenInView] = useState(true);
  const handleSpokenInViewChange = useCallback((inView: boolean) => {
    setSpokenInView(inView);
  }, []);

  const requestSeat = useCallback((seg: number) => {
    if (seg < 0) return;
    const y = segY.current[seg];
    if (typeof y === 'number') {
      pendingSeatSegRef.current = null;
      setSeatSeg(null);
      scrollRef.current?.scrollTo({
        y: followScrollTarget(transcriptTop.current + y, screenHRef.current),
        animated: true,
      });
      return;
    }
    pendingSeatSegRef.current = seg;
    setSeatSeg(seg);
  }, []);

  const handleSegLayout = useCallback((index: number, y: number) => {
    segY.current[index] = y;
    // v520: a pending deliberate seat completes off this
    // row's real measurement — the v519 far-seek completion,
    // now invoked only here, for a seat a person asked for.
    // Any other layout (the reader's window travelling, a
    // re-measure) scrolls nothing, ever.
    if (pendingSeatSegRef.current === index) {
      pendingSeatSegRef.current = null;
      setSeatSeg(null);
      scrollRef.current?.scrollTo({
        y: followScrollTarget(transcriptTop.current + y, screenHRef.current),
        animated: true,
      });
    }
  }, []);
  const handleTranscriptPanelLayout = useCallback((y: number) => {
    transcriptTop.current = y;
  }, []);

  // ── v522: the Transcript button — it toggles the VIEW ─────
  // OFF → ON: the engagement begins ('following'). The
  // landing seat is deliberately NOT requested here: off
  // gates activeSegIdx to -1, so the render that turns the
  // view on computes the real spoken segment for the first
  // time, and the boundary effect below reads that -1 →
  // segment step as the landing and seats it — once, through
  // the measurement machinery above. ON → OFF (from following
  // or released alike, one press): the engagement ends, and
  // any seat still in flight dies with the view — a stale
  // completion must not scroll a page the transcript has
  // left. Either way, an in-flight seat is cleared first:
  // the toggle is the newest word on where the page goes.
  const toggleTranscript = useCallback(() => {
    pendingSeatSegRef.current = null;
    setSeatSeg(null);
    if (transcriptViewRef.current === 'off') {
      transcriptViewRef.current = 'following';
      setTranscriptView('following');
    } else {
      transcriptViewRef.current = 'off';
      setTranscriptView('off');
    }
  }, []);

  // ── v510: the follow-along camera yields to the reader ──────
  // v508's camera scrolled on EVERY active-segment change, so a
  // reader scrolling up to leave was yanked back down to the
  // voice on the next segment boundary — the fight in Jonathan's
  // Nov 12 report. Now a drag of the page suspends the camera
  // (the highlighting keeps following; only the camera parks),
  // and it stays parked until DEVOTIONAL_FOLLOW_RESUME_MS after
  // his scrolling ends or a seek re-engages it at once. When the
  // grace lapses the camera first returns to the segment being
  // spoken, then follows as before.
  // v520: this whole section is now the CHAPTER sessions'
  // paragraph camera ONLY — the behaviour above is preserved
  // exactly for them (the audit found the same continual
  // hunting there; reported, not changed — his call named the
  // transcript). Nothing in this section touches a transcript
  // session any more: tour entries carry no paragraphs, so the
  // paragraph seat below has nothing to read, and the
  // transcript's boundary effect that stood beside the
  // paragraph one is deleted outright.
  const followSuspendedRef = useRef(false);
  const lastManualScrollAtRef = useRef(0);
  const followResumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeParaRef = useRef(activeIdx);
  // v512: the React mirror of the parked camera — it seats the
  // chapter Catch up button (below), which exists only while
  // the camera is parked. The ref stays the logic's source of
  // truth; this state is set at exactly the moments the ref
  // flips. (A transcript session's Catch up stands on the
  // panel's spoken-in-view report instead — see below.)
  const [followParked, setFollowParked] = useState(false);

  // The paragraph camera's seat (chapter sessions only): the
  // active paragraph, a third of the screen down.
  const scrollToActivePara = useCallback(() => {
    const y = paraY.current[activeParaRef.current];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: followScrollTarget(y, screenH), animated: true });
    }
  }, [screenH]);

  const engageFollow = useCallback(() => {
    followSuspendedRef.current = false;
    setFollowParked(false);
    if (followResumeTimerRef.current) {
      clearTimeout(followResumeTimerRef.current);
      followResumeTimerRef.current = null;
    }
  }, []);

  const armFollowResume = useCallback(() => {
    if (followResumeTimerRef.current) clearTimeout(followResumeTimerRef.current);
    followResumeTimerRef.current = setTimeout(() => {
      followResumeTimerRef.current = null;
      // Only resume if the grace has truly lapsed since his LAST
      // scroll — a drag that ended a moment ago re-arms instead.
      if (Date.now() - lastManualScrollAtRef.current >= DEVOTIONAL_FOLLOW_RESUME_MS) {
        followSuspendedRef.current = false;
        setFollowParked(false);
        scrollToActivePara();
      }
    }, DEVOTIONAL_FOLLOW_RESUME_MS);
  }, [scrollToActivePara]);

  const suspendFollow = useCallback(() => {
    followSuspendedRef.current = true;
    setFollowParked(true);
    lastManualScrollAtRef.current = Date.now();
    armFollowResume();
  }, [armFollowResume]);

  // A fling keeps gliding after the finger lifts: the grace
  // clock runs from the END of his scroll, not the grab.
  const noteManualScrollEnd = useCallback(() => {
    if (!followSuspendedRef.current) return;
    lastManualScrollAtRef.current = Date.now();
    armFollowResume();
  }, [armFollowResume]);

  useEffect(
    () => () => {
      if (followResumeTimerRef.current) clearTimeout(followResumeTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    activeParaRef.current = activeIdx;
    if (followSuspendedRef.current) return;
    const y = paraY.current[activeIdx];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: followScrollTarget(y, screenH), animated: true });
    }
  }, [activeIdx, screenH]);

  // v522: the segment-boundary effect is back — but it answers
  // to the reader's switch alone. v510's camera followed by
  // default; v520 removed it outright (the continual hunting
  // Jonathan named). The Apple Music model he named puts the
  // following behind his toggle: this effect seats the spoken
  // segment on a boundary ONLY while the transcript view is
  // on and follow is engaged. Off, or released by his swipe,
  // a boundary moves nothing — the spoken segment's lit dress
  // is computed in the render (activeSegIdx → the panel's row
  // states) and costs no camera work at all. The toggle-on
  // landing rides this same effect: off gates the index to
  // -1, so turning the view on steps it to the spoken segment
  // and the effect seats it exactly once. A deliberate seat
  // (Catch up, a guidepost, a transcript line, the seek bar)
  // still rides requestSeat above, in any on-state, and never
  // flips the engagement either way.
  useEffect(() => {
    if (transcriptViewRef.current !== 'following') return;
    if (activeSegIdx < 0) return;
    requestSeat(activeSegIdx);
  }, [activeSegIdx, requestSeat]);

  // The reader's own swipe releases the follow. The drag
  // lifecycle is the discriminator: onScrollBeginDrag fires
  // for a genuine touch drag and never for the camera's own
  // programmatic scrolls, so only his hand moves following →
  // released. The release cancels a seat still in flight —
  // the camera stops with his grab. (A deliberate seat armed
  // in the RELEASED state is untouched: this runs only from
  // following, so v520's one-shot stands even if he scrolls
  // while it lands.)
  const releaseTranscriptFollow = useCallback(() => {
    if (transcriptViewRef.current !== 'following') return;
    transcriptViewRef.current = 'released';
    setTranscriptView('released');
    pendingSeatSegRef.current = null;
    setSeatSeg(null);
  }, []);

  // One drag, both yields: the chapter camera's park (above)
  // and the transcript follow's release. Each reads its own
  // state; a transcript session has no paragraphs for the
  // chapter half to move, and a chapter session has no
  // transcript view for this half to release.
  const handleScrollBeginDrag = useCallback(() => {
    suspendFollow();
    releaseTranscriptFollow();
  }, [suspendFollow, releaseTranscriptFollow]);

  const seek = (fraction: number) => {
    if (duration > 0) {
      // A deliberate jump on the seek bar is a "take me there" —
      // the chapter camera re-engages with it, and a tour's
      // transcript takes the one-shot seat to the segment at
      // the landing point.
      engageFollow();
      const target = Math.max(0, Math.min(1, fraction)) * duration;
      seekDevotional(target);
      if (transcriptRows && devotional.transcriptSegments) {
        requestSeat(activeTenStopsTranscriptSegment(devotional.transcriptSegments, target));
      }
    }
  };

  // The panels' seek door (a guidepost, a transcript line): the
  // same seek. For a chapter the camera re-engages as before;
  // for a tour the tap is a deliberate seat — the segment at
  // the tapped second is seated once, and nothing follows
  // after it.
  const seekAndFollow = useCallback(
    (sec: number) => {
      engageFollow();
      seekDevotional(sec);
      if (transcriptRows && devotional.transcriptSegments) {
        requestSeat(activeTenStopsTranscriptSegment(devotional.transcriptSegments, sec));
      }
    },
    // requestSeat is stable; the transcript test reads the
    // current session's rows/segments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [engageFollow, transcriptRows, devotional],
  );

  // ── The collapse morph ──────────────────────────────────────────
  // Opened from the pill, the surface mounts ALREADY at p = 1 (the
  // pill's geometry and colour) and settles open; opened from a
  // chapter door it mounts as the plain page.
  const expandMorph = useMemo(() => consumeDevotionalExpandMorph(), []);
  const collapseP = useSharedValue(expandMorph ? 1 : 0);
  useEffect(() => {
    if (expandMorph && reduceMotionKnown) {
      collapseP.value = withTiming(0, { duration: settleMs(), easing: EMPHASIZED });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotionKnown]);

  const pillBottom = tabBarHeight + 10;
  const pillTop = screenH - pillBottom - PILL_HEIGHT;

  // v510: a close in flight. While the surface collapses, the
  // page content is NOT touchable (the ScrollView's
  // pointerEvents below): mid-morph the words travel up over
  // p 0 → 0.45 (v512: travel only — the fade is gone) but the
  // controls stayed live, so a stray tap on the seat the Stop
  // button was leaving could run the Stop sequence — the close
  // then cleared the session it was only supposed to minimise,
  // and the pill was gone with it.
  const [closing, setClosing] = useState(false);
  // Every new morph driver (a settle, a drag grabbing the
  // surface) bumps this epoch. A settle callback whose epoch has
  // moved on was superseded; it must not hand off under the
  // reader's finger.
  const morphEpochRef = useRef(0);

  // The hand-off: raise the flag BEFORE the route closes, so the
  // root pill mounts already settled in the seat the morph landed
  // in — the swap is invisible.
  const handOffAndBack = () => {
    requestDevotionalPillHandoff();
    onBackRef.current();
  };

  // v519: a stable callback (it drives only refs, shared
  // values and setState, and hands off through the onBack ref)
  // so the memoised face receives a minimize prop that does
  // not change identity per render.
  const settleCollapse = useCallback((toPill: boolean) => {
    const epoch = ++morphEpochRef.current;
    setClosing(toPill);
    collapseP.value = withTiming(
      toPill ? 1 : 0,
      { duration: settleMs(), easing: EMPHASIZED },
      (finished) => {
        // v510: an interrupted settle into the pill still
        // completes the close — a frozen half-shrunk surface is
        // a dead end — UNLESS a newer driver superseded it (a
        // drag grabbing the surface, a settle back open): the
        // epoch says which. Either way the close is a collapse
        // only: the session is never touched here.
        if (toPill && (finished || morphEpochRef.current === epoch)) {
          runOnJS(handOffAndBack)();
        }
      },
    );
    // settleMs / handOffAndBack read only refs (reducedMotion,
    // onBack) — stable across renders by construction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minimize = useCallback(() => settleCollapse(true), [settleCollapse]);

  // Dragging down scrubs the morph with the finger (the demo:
  // p = start + dy / 300). Only a clear downward drag AT THE TOP of
  // the page claims the gesture, so taps, the seek bar, and
  // ordinary scrolling keep working.
  const dragStartP = useRef(0);
  const stoppingRef = useRef(false);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          !stoppingRef.current && scrollTopRef.current && g.dy > 24 && g.dy > Math.abs(g.dx) * 1.6,
        onPanResponderGrant: () => {
          // v510: grabbing the surface supersedes any settle in
          // flight (its callback must not hand off under the
          // finger) and the page is the reader's again.
          morphEpochRef.current += 1;
          setClosing(false);
          cancelAnimation(collapseP);
          dragStartP.current = collapseP.value;
        },
        onPanResponderMove: (_e, g) => {
          collapseP.value = Math.min(1, Math.max(0, dragStartP.current + g.dy / DEVOTIONAL_COLLAPSE_TRAVEL_PX));
        },
        onPanResponderRelease: () => {
          settleCollapse(collapseP.value > DEVOTIONAL_COLLAPSE_THRESHOLD);
        },
        onPanResponderTerminate: () => {
          settleCollapse(collapseP.value > DEVOTIONAL_COLLAPSE_THRESHOLD);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── v510: Android back is a close, and a close is a collapse ──
  // The hardware back / edge-swipe used to pop the route bare —
  // no morph, no hand-off flag, the one exit that never passed
  // through the pill seat. Now back runs the same hand-off as
  // every other close (flag raised, then the route closes, the
  // root pill is simply there, the session untouched) and the
  // gesture is consumed. While the Stop sequence runs it owns
  // the exit, so back is swallowed rather than doubled.
  const backCloseRef = useRef<() => void>(() => undefined);
  backCloseRef.current = () => {
    if (stoppingRef.current) return;
    handOffAndBack();
  };
  useEffect(() => {
    const sub = BackHandler?.addEventListener('hardwareBackPress', () => {
      backCloseRef.current();
      return true;
    });
    return () => {
      sub?.remove();
    };
  }, []);

  // ── Stop: spread → hold → slide away → clear ────────────────────
  const spread = useSharedValue(0);
  const spreadCx = useSharedValue(0);
  const spreadCy = useSharedValue(0);
  const spreadMax = useSharedValue(0);
  const exitP = useSharedValue(0);
  const stopBtnRef = useRef<any>(null);
  const [stopping, setStopping] = useState(false);

  const finishStop = () => {
    stopDevotional();
    onBackRef.current();
  };

  // v519: stable callbacks, like settleCollapse — the
  // controls row is a memoised leaf and its props must not
  // change identity per render. finishStop reads only the
  // onBack ref and the controller, so the first-render
  // instance these capture is always current.
  const runStopSequence = useCallback(
    (cx: number, cy: number) => {
      spreadCx.value = cx;
      spreadCy.value = cy;
      spreadMax.value =
        2 *
        Math.max(
          Math.hypot(cx, cy),
          Math.hypot(screenW - cx, cy),
          Math.hypot(cx, screenH - cy),
          Math.hypot(screenW - cx, screenH - cy),
        );
      spread.value = withTiming(1, { duration: DEVOTIONAL_STOP_SPREAD_MS, easing: EMPHASIZED }, (spreadDone) => {
        if (spreadDone) {
          exitP.value = withDelay(
            DEVOTIONAL_STOP_HOLD_MS,
            withTiming(1, { duration: DEVOTIONAL_STOP_EXIT_MS, easing: EMPHASIZED }, (exitDone) => {
              if (exitDone) runOnJS(finishStop)();
            }),
          );
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenW, screenH],
  );

  const stop = useCallback(() => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    setStopping(true);
    // Reduce motion: no spread, no slide — the end state, now.
    if (reducedMotionRef.current) {
      finishStop();
      return;
    }
    const node = stopBtnRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, w: number, h: number) => runStopSequence(x + w / 2, y + h / 2));
    } else {
      runStopSequence(52, screenH * 0.55);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStopSequence, screenH]);

  // ── Animated styles, all driven by the one progress value ──────
  const surfaceStyle = useAnimatedStyle(() => {
    const p = collapseP.value;
    return {
      left: interpolate(p, [0, 1], [0, PILL_SIDE]),
      right: interpolate(p, [0, 1], [0, PILL_SIDE]),
      top: interpolate(p, [0, 1], [0, pillTop]),
      bottom: interpolate(p, [0, 1], [0, pillBottom]),
      borderRadius: interpolate(p, [0, 1], [0, PILL_HEIGHT / 2]),
      backgroundColor: interpolateColor(p, [0, 1], [theme.ground, theme.primary]),
      opacity: 1 - exitP.value * 0.6,
      transform: [{ translateY: exitP.value * screenH * 1.06 }],
    };
  }, [theme, pillTop, pillBottom, screenH]);

  // The demo's windows, re-drawn v512: NO opacity anywhere in
  // this morph (Jonathan: "Why does the player have this fade
  // when it's going down? Shouldn't it just stay the same red
  // color?"). Content out over 0 → 0.45 by its 14px travel alone
  // — the shrinking surface retires it — and the pill face in
  // over 0.55 → 1 by SLIDING up into the seat, not fading: it is
  // seat-proportioned, bottom-anchored inside the surface and
  // clipped by it, parked a seat-height below its seat until the
  // window opens, fully opaque throughout. Bounds, position and
  // colour are all the morph moves now.
  const contentStyle = useAnimatedStyle(() => {
    const p = collapseP.value;
    return {
      transform: [
        { translateY: interpolate(p, [0, DEVOTIONAL_COLLAPSE_CONTENT_OUT_END], [0, -DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX]) },
      ],
    };
  });

  const pillFaceStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          PILL_HEIGHT *
          (1 - interpolate(collapseP.value, [DEVOTIONAL_COLLAPSE_PILL_IN_START, 1], [0, 1], Extrapolation.CLAMP)),
      },
    ],
  }));

  const spreadStyle = useAnimatedStyle(() => {
    const d = spread.value * spreadMax.value;
    return {
      width: d,
      height: d,
      left: spreadCx.value - d / 2,
      top: spreadCy.value - d / 2,
      borderRadius: d / 2,
      opacity: spread.value > 0 ? 1 : 0,
    };
  });

  return (
    <Animated.View style={[styles.surface, surfaceStyle]} {...pan.panHandlers}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={!stopping}
        pointerEvents={closing || stopping ? 'none' : 'auto'}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={noteManualScrollEnd}
        onMomentumScrollEnd={noteManualScrollEnd}
        onScroll={(e) => {
          const y = e.nativeEvent.contentOffset.y;
          scrollTopRef.current = y <= 2;
          if (Math.abs(y - scrollHintRef.current) >= 120) {
            scrollHintRef.current = y;
            setScrollHint(y);
          }
        }}
        scrollEventThrottle={64}
      >
        <Animated.View style={[styles.page, { paddingTop: insets.top + 14 }, contentStyle]}>
          {/* The face — header, title, big idea, hero (v519: a
              memoised leaf; nothing it wears moves with the
              position, so the tick passes over it). */}
          <PlayerFace
            contextLine={devotionalContextLine(devotional)}
            title={devotional.title}
            bigIdea={bigIdea}
            bookLevel={!!devotional.bookLevel}
            book={devotional.book}
            chapter={devotional.chapter}
            facts={facts}
            primary={theme.primary}
            ink={theme.ink}
            inkSoft={theme.inkSoft}
            accent={theme.accent}
            stopSeat={theme.stopSeat}
            onMinimize={minimize}
          />

          {/* The Material wavy seek, in the book colour (the app's
              wavy-progress family, v339). Tap to seek, as before. */}
          <Pressable
            style={styles.seekTouch}
            onPress={(e) => {
              if (trackWidth.current > 0) seek(e.nativeEvent.locationX / trackWidth.current);
            }}
            onLayout={(e) => {
              trackWidth.current = e.nativeEvent.layout.width;
            }}
            accessibilityLabel="Seek"
          >
            <WavyProgress value={duration > 0 ? position / duration : 0} color={theme.primary} trackColor={theme.track} height={14} />
          </Pressable>
          <View style={styles.times}>
            <Text style={[styles.time, { color: theme.inkSoft }]}>{formatClock(position)}</Text>
            <Text style={[styles.time, { color: theme.inkSoft }]}>{formatClock(duration)}</Text>
          </View>

          {/* ONE controls row: the filled-tonal Stop pill at the
              left margin, the big primary play EXACTLY at the
              page's horizontal centre (absolute, not flex-grouped
              — v497's grouped row left it wherever Stop's width
              put it). v519: a memoised leaf — it re-renders when
              play state flips, not on position ticks. */}
          <ControlsRow
            playing={playing}
            ended={ended}
            primary={theme.primary}
            stopSeat={theme.stopSeat}
            accent={theme.accent}
            stopBtnRef={stopBtnRef}
            onStop={stop}
            onToggle={toggleDevotionalPlayback}
            transcriptOn={transcriptView !== 'off'}
            onToggleTranscript={transcriptRows ? toggleTranscript : null}
          />

          {/* The guideposts — only where real timed movements
              exist (no chapter's do; the Ten Stops tour's ten
              stops do, v506 — see devotionalGuideposts). v515:
              part of the post-first-paint hydration (see above). */}
          {panelsReady && guideposts ? (
            <GuidepostsPanel
              movements={guideposts}
              heading={devotional.bookLevel ? 'THE TEN STOPS' : 'IN THIS CHAPTER'}
              panel={theme.panel}
              primary={theme.primary}
              ink={theme.ink}
              inkSoft={theme.inkSoft}
              accent={theme.accent}
              onSeek={seekAndFollow}
            />
          ) : null}

          {/* The transcript (v508) — a tour's own words at
              segment level, grouped under their stops, the
              spoken segment lit; a tap on any segment seeks
              there. Tours only: chapter sessions carry none.
              v515: hydrates with the panels (see above) — its
              ~300–500 rows were the build that held the expand
              on a bare coloured screen.
              v522: behind the Transcript toggle now — mounted
              only while the view is on. Off is a true unmount:
              no rows, no window, no offsets model runs. While
              follow is engaged the panel's seat target is the
              spoken segment itself (the follow anchor); in
              the released state it is the deliberate seat, if
              one is in flight. */}
          {panelsReady && transcriptRows && transcriptView !== 'off' ? (
            <TranscriptPanel
              rows={transcriptRows}
              activeIdx={activeSegIdx}
              panel={theme.panel}
              primary={theme.primary}
              ink={theme.ink}
              inkSoft={theme.inkSoft}
              stopSeat={theme.stopSeat}
              onSeek={seekAndFollow}
              onSegLayout={handleSegLayout}
              onPanelLayout={handleTranscriptPanelLayout}
              scrollY={scrollHint}
              viewportHeight={screenH}
              seatSeg={transcriptView === 'following' ? activeSegIdx : seatSeg}
              onSpokenInViewChange={handleSpokenInViewChange}
            />
          ) : null}

          {/* The words, where a transcript exists — flowing in the
              page's own column, nothing hidden. v515: hydrates
              with the panels (see above). */}
          {panelsReady ? (
            <FollowAlong
              paragraphs={devotional.paragraphs}
              activeIdx={activeIdx}
              stopSeat={theme.stopSeat}
              primary={theme.primary}
              ink={theme.ink}
              inkSoft={theme.inkSoft}
              onParaLayout={handleParaLayout}
            />
          ) : null}
          <Text style={[styles.hint, { color: theme.inkSoft }]}>Swipe down to keep listening while you study</Text>
        </Animated.View>
      </ScrollView>

      {/* The top of the page: no solid bar — content meets a short
          soft gradient fade at the very top edge (the app-wide
          page rule), above the status strip only, so the header
          row below it stays crisp. */}
      <View pointerEvents="none" style={[styles.topFade, { height: insets.top + 10 }]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="devotionalTopFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.ground} stopOpacity={0.96} />
              <Stop offset="1" stopColor={theme.ground} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#devotionalTopFade)" />
        </Svg>
      </View>

      {/* v512: Catch up — Jonathan's ask (Nov 12): "a 'Jump' or
          'Catch Up' button at the bottom of the screen that takes
          you right to where the transcript currently is."
          v520 (his design call, Nov 13): for a TRANSCRIPT session
          the pill was the whole follow mechanism — it stood
          whenever the spoken segment was outside the reader's
          view, and a tap made the one-shot snap.
          v522 (the Apple Music model, Nov 13): the capsule now
          lives INSIDE the transcript's on state — it stands
          only while the panel is on, follow has been released
          by the reader's swipe, and the spoken segment is out
          of his view (the panel reports the fact). Never in
          OFF, never while following — so it is not always
          constantly there (his objection to the v520 standing).
          A tap is Apple Music's jump back to the live line: it
          seats the spoken segment AND re-engages follow, then
          hides (its standing excludes following). For a
          CHAPTER session it keeps its v512 standing exactly:
          it exists only while the paragraph camera is parked
          (the v510 yield state), and the tap seats the active
          paragraph and re-engages that camera. Never offered
          when the session has no follow-along at all. Dressed
          in the player's own chrome: the book family's primary,
          the pill's capsule shape, white on it. */}
      {!closing &&
      !stopping &&
      (transcriptRows != null
        ? transcriptView === 'released' && !spokenInView
        : followParked && devotional.paragraphs.length > 0) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Catch up to the audio"
          onPress={() => {
            if (transcriptRows != null) {
              transcriptViewRef.current = 'following';
              setTranscriptView('following');
              requestSeat(activeSegIdx);
            } else {
              engageFollow();
              scrollToActivePara();
            }
          }}
          style={[styles.catchUp, { bottom: insets.bottom + 16, backgroundColor: theme.primary }]}
        >
          <MaterialIcons name="my-location" size={18} color="#FFFFFF" />
          <Text style={styles.catchUpLabel}>Catch up</Text>
        </Pressable>
      ) : null}

      {/* The pill's own face, sliding up into the seat over the
          morph's last stretch (v512: a position reveal, no fade —
          the face wears the opaque primary throughout) so that at
          p = 1 the surface IS the pill; the route then closes
          into the root pill in the same seat. v519: a memoised
          leaf (PillFace above) — its slide rides the animated
          style, not the render. */}
      <PillFace
        playing={playing}
        title={devotional.title}
        contextLine={devotionalContextLine(devotional)}
        primary={theme.primary}
        animatedStyle={pillFaceStyle}
      />

      {/* Stop: the primary spreads from the Stop button across
          the whole surface (see the sequence above). */}
      <Animated.View pointerEvents="none" style={[styles.spread, { backgroundColor: theme.primary }, spreadStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  surface: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' },
  page: { paddingHorizontal: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', paddingTop: 8 },
  chevronBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, fontWeight: '800', lineHeight: 30, marginTop: 9 },
  bigIdea: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 15.5, lineHeight: 22, marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  numeral: { fontSize: 76, fontWeight: '800', lineHeight: 80 },
  // v501: the book-level hero — a book's name at a measure a word
  // can carry, in the numeral's seat and colour.
  numeralBook: { fontSize: 34, lineHeight: 40 },
  facts: { flex: 1 },
  factStrong: { fontSize: 12.5, fontWeight: '700', lineHeight: 19 },
  fact: { fontSize: 12.5, lineHeight: 19 },
  seekTouch: { marginTop: 18, height: 30, justifyContent: 'center' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  time: { fontSize: 11.5, fontWeight: '600' },
  controls: { position: 'relative', height: 64, marginTop: 14, marginBottom: 4 },
  stopBtn: {
    position: 'absolute',
    left: 0,
    top: (64 - 43) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  stopText: { fontSize: 14, fontWeight: '700' },
  // v522: the Transcript chip — the Stop pill's geometry,
  // mirrored to the controls row's right margin.
  transcriptBtn: {
    position: 'absolute',
    right: 0,
    top: (64 - 43) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  transcriptText: { fontSize: 14, fontWeight: '700' },
  playBtn: {
    position: 'absolute',
    left: '50%',
    marginLeft: -32,
    top: 0,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  panel: { borderRadius: 20, paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10, marginTop: 18 },
  panelTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  guideRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 9 },
  guideTextCol: { flex: 1 },
  guideName: { fontSize: 14.5, fontWeight: '600' },
  guidePassage: { fontSize: 12.5, fontWeight: '500', marginTop: 1 },
  guideTime: { fontSize: 12.5, fontWeight: '700' },
  guideDivider: { height: StyleSheet.hairlineWidth, opacity: 0.16 },
  transcriptHead: { marginTop: 14, marginBottom: 6 },
  transcriptSeg: {
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  follow: { marginTop: 16 },
  para: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  paraText: { fontSize: 17, lineHeight: 26 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 18 },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0 },
  catchUp: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 999,
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    zIndex: 5,
  },
  catchUpLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  // v512: seat-proportioned — a pill-height strip anchored to the
  // surface's BOTTOM edge (not an absolute fill), so the slide-up
  // reveal seats the face exactly where the pill lands, and the
  // surface's own overflow clips the parked strip below its floor.
  pillFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  pillDisc: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  pillTxt: { flex: 1, marginLeft: 12 },
  pillTitle: { fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' },
  pillCtx: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 1 },
  pillSeat: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  spread: { position: 'absolute' },
});
