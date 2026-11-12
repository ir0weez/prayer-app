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
// audio is the downloaded local file, and with no transcript the
// follow-along simply never renders — as for the narrations.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
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
import { tenStopsLocalSource } from '@/lib/ten-stops-download';
import { loadChapterVerses } from '@/lib/bible-v205/verses';
import {
  consumeDevotionalExpandMorph,
  devotionalEnded,
  openDevotional,
  requestDevotionalPillHandoff,
  seekDevotional,
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

// ─── The follow-along words ─────────────────────────────────────────────────
// The paragraphs in the page's single scroll column — no fold, no
// expander, nothing hidden behind a button. Memoised on its inputs
// (paragraphs, active index, the four stops it wears) so neither
// the collapse morph nor a playback tick re-renders the words.
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
      {paragraphs.map((text, i) => {
        const state = i === activeIdx ? 'active' : i < activeIdx ? 'done' : 'next';
        return (
          <View
            key={i}
            onLayout={(e) => props.onParaLayout(i, e.nativeEvent.layout.y)}
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
              {text}
            </Text>
          </View>
        );
      })}
      <Text style={[styles.foot, { color: props.inkSoft }]}>
        The words follow the reading by proportion — listen, and read along.
      </Text>
    </View>
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
  const guideposts = devotionalGuideposts(devotional);
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
  const facts = devotionalFacts(devotional, lastVerse, duration);

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

  // Follow the voice: bring the active paragraph into view as it changes.
  const scrollRef = useRef<ScrollView>(null);
  const paraY = useRef<number[]>([]);
  const trackWidth = useRef(0);
  const scrollTopRef = useRef(true);
  const handleParaLayout = useCallback((index: number, y: number) => {
    paraY.current[index] = y;
  }, []);
  useEffect(() => {
    const y = paraY.current[activeIdx];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
    }
  }, [activeIdx]);

  const seek = (fraction: number) => {
    if (duration > 0) seekDevotional(Math.max(0, Math.min(1, fraction)) * duration);
  };

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

  // The hand-off: raise the flag BEFORE the route closes, so the
  // root pill mounts already settled in the seat the morph landed
  // in — the swap is invisible.
  const handOffAndBack = () => {
    requestDevotionalPillHandoff();
    onBackRef.current();
  };

  const settleCollapse = (toPill: boolean) => {
    collapseP.value = withTiming(
      toPill ? 1 : 0,
      { duration: settleMs(), easing: EMPHASIZED },
      (finished) => {
        if (finished && toPill) runOnJS(handOffAndBack)();
      },
    );
  };

  const minimize = () => settleCollapse(true);

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

  const runStopSequence = (cx: number, cy: number) => {
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
  };

  const stop = () => {
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
  };

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

  // The demo's windows: content out over 0 → 0.45 (fading and
  // drifting up), pill face in over 0.55 → 1. The surface is never
  // blank between them — it is a coloured, shrinking surface.
  const contentStyle = useAnimatedStyle(() => {
    const p = collapseP.value;
    return {
      opacity: interpolate(p, [0, DEVOTIONAL_COLLAPSE_CONTENT_OUT_END], [1, 0]),
      transform: [
        { translateY: interpolate(p, [0, DEVOTIONAL_COLLAPSE_CONTENT_OUT_END], [0, -DEVOTIONAL_COLLAPSE_CONTENT_TRAVEL_PX]) },
      ],
    };
  });

  const pillFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseP.value, [DEVOTIONAL_COLLAPSE_PILL_IN_START, 1], [0, 1]),
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
        onScroll={(e) => {
          scrollTopRef.current = e.nativeEvent.contentOffset.y <= 2;
        }}
        scrollEventThrottle={64}
      >
        <Animated.View style={[styles.page, { paddingTop: insets.top + 14 }, contentStyle]}>
          {/* The header row: kicker left, the collapse chevron at
              the top right in its quiet tonal seat — it runs the
              same morph as the drag. */}
          <View style={styles.headerRow}>
            <Text style={[styles.kicker, { color: theme.primary }]}>{devotionalContextLine(devotional)}</Text>
            <Pressable
              onPress={minimize}
              hitSlop={10}
              style={[styles.chevronBtn, { backgroundColor: theme.stopSeat }]}
              accessibilityLabel="Minimize player"
            >
              <MaterialIcons name="keyboard-arrow-down" size={18} color={theme.accent} />
            </Pressable>
          </View>

          <Text style={[styles.title, { color: theme.ink }]}>{devotional.title}</Text>

          {/* The chapter's big-idea sentence, in his own words —
              only where a source carries one. */}
          {bigIdea ? (
            <Text style={[styles.bigIdea, { color: theme.accent }]}>“{bigIdea}”</Text>
          ) : null}

          {/* The hero row: the numeral, and beside it the facts.
              A book-level tour (v501) has no numeral to show — the
              BOOK's name takes the hero seat instead, set smaller
              so a word fits where a number stood. */}
          <View style={styles.heroRow}>
            <Text
              style={[
                styles.numeral,
                { color: theme.primary },
                devotional.bookLevel ? styles.numeralBook : null,
              ]}
            >
              {devotional.bookLevel ? devotional.book : devotional.chapter}
            </Text>
            <View style={styles.facts}>
              {facts.range ? (
                <Text style={[styles.factStrong, { color: theme.ink }]}>{facts.range}</Text>
              ) : null}
              <Text style={[styles.fact, { color: theme.inkSoft }]}>{facts.chapterLine}</Text>
              <Text style={[styles.fact, { color: theme.inkSoft }]}>{facts.durationLine}</Text>
            </View>
          </View>

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
              put it). */}
          <View style={styles.controls}>
            <Pressable
              ref={stopBtnRef}
              onPress={stop}
              style={[styles.stopBtn, { backgroundColor: theme.stopSeat }]}
              accessibilityLabel="Stop"
            >
              <MaterialIcons name="stop" size={14} color={theme.accent} />
              <Text style={[styles.stopText, { color: theme.accent }]}>Stop</Text>
            </Pressable>
            <Pressable
              onPress={toggleDevotionalPlayback}
              style={[styles.playBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
              accessibilityLabel={playing ? 'Pause' : ended ? 'Play again' : 'Play'}
            >
              <MaterialIcons name={playing ? 'pause' : ended ? 'replay' : 'play-arrow'} size={28} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* The guideposts — only where real timed movements
              exist (no chapter's do; the Ten Stops tour's ten
              stops do, v506 — see devotionalGuideposts). */}
          {guideposts ? (
            <GuidepostsPanel
              movements={guideposts}
              heading={devotional.bookLevel ? 'THE TEN STOPS' : 'IN THIS CHAPTER'}
              panel={theme.panel}
              primary={theme.primary}
              ink={theme.ink}
              inkSoft={theme.inkSoft}
              accent={theme.accent}
              onSeek={seekDevotional}
            />
          ) : null}

          {/* The words, where a transcript exists — flowing in the
              page's own column, nothing hidden. */}
          <FollowAlong
            paragraphs={devotional.paragraphs}
            activeIdx={activeIdx}
            stopSeat={theme.stopSeat}
            primary={theme.primary}
            ink={theme.ink}
            inkSoft={theme.inkSoft}
            onParaLayout={handleParaLayout}
          />
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

      {/* The pill's own face, fading in over the morph's last
          stretch so that at p = 1 the surface IS the pill; the
          route then closes into the root pill in the same seat. */}
      <Animated.View pointerEvents="none" style={[styles.pillFace, pillFaceStyle]}>
        <View style={styles.pillDisc}>
          <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={theme.primary} />
        </View>
        <View style={styles.pillTxt}>
          <Text style={styles.pillTitle} numberOfLines={1}>
            {devotional.title}
          </Text>
          <Text style={styles.pillCtx} numberOfLines={1}>
            {devotionalContextLine(devotional)}
          </Text>
        </View>
        <View style={styles.pillSeat}>
          <MaterialIcons name="stop" size={15} color="rgba(255,255,255,0.88)" />
        </View>
        <View style={styles.pillSeat}>
          <MaterialIcons name="keyboard-arrow-up" size={19} color="rgba(255,255,255,0.88)" />
        </View>
      </Animated.View>

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
  follow: { marginTop: 16 },
  para: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  paraText: { fontSize: 17, lineHeight: 26 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 18 },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0 },
  pillFace: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
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
