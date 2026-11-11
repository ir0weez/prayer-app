// ─── Devotional player screen (v230 → v293 → v497) ─────────────────────────
// v497 is the approved rebuild (mockups devotional-player-concepts
// v4/v5/v8, his picks across NOV 11): the full player is Concept 2
// "Chunky Numeral" — a plain surface ground with NO solid top bar
// (content meets a soft fade at the top, the app-wide page rule),
// the chapter numeral as the ONE hero at ~100px in the book's deep
// primary, the Material wavy seek in the book colour, ONE controls
// row (filled-tonal Stop pill + big primary circular play), and the
// follow-along words seated quietly below, unchanged.
//
// Colours come from lib/devotional-player-theme.ts: every stop
// derives from the book's own ROYGBIV hue at the mockup's depth
// (Genesis, the drawn instance: primary #9C2A10, accent #7A1F0D,
// track #DFA58D, stop seat #E7B29A on ground #FFF8F5).
//
// COLLAPSE (the v4 demo's engine, ported): ONE progress value
// (0 = full page, 1 = pill) drives every animated property of the
// surface — its seat shrinks from full-screen to the pill's exact
// seat (14px sides, 66px tall, radius 0 → 33), its ground
// cross-fades to the pill's primary, the page content fades and
// settles as it travels, and the pill's own face fades in over the
// last stretch. A downward drag at the top of the page SCRUBS the
// value with the finger over 300px of travel; release past 35%
// settles into the pill (~500ms, Material emphasized
// cubic-bezier(0.2, 0, 0, 1)), under it settles back up. On settle
// the route closes and the root pill — already sitting in that
// exact seat wearing those exact stops — takes over, so it reads
// as one object changing shape, never a cut. The chevron does the
// same morph for non-gesture users. Opening from the pill reverses
// it (lib/devotional-player's one-shot expand-morph flag).
//
// STOP (his idea, sequenced): the primary spreads from the Stop
// button across the whole surface (380ms), holds (250ms), the
// surface slides down and away (400ms) — and only then does the
// session clear (pause, rewind, session gone: the v293 semantics,
// unchanged, just sequenced after the animation).
//
// Playback still lives in the shared controller
// (lib/devotional-player.ts), not in this screen: leaving the
// screen never unloads the player. The words on screen, where a
// transcript exists, follow the audio by PROPORTION
// (character-length-weighted — see lib/devotionals.ts; NOT
// word-sync, and no UI copy claims otherwise).

import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { activeParagraphIndex, devotionalKey, formatClock, type Devotional } from '@/lib/devotionals';
import { devotionalAudioFor } from '@/lib/devotional-audio';
import {
  consumeDevotionalExpandMorph,
  devotionalEnded,
  openDevotional,
  seekDevotional,
  stopDevotional,
  toggleDevotionalPlayback,
  useDevotionalPlayerState,
} from '@/lib/devotional-player';
import {
  DEVOTIONAL_COLLAPSE_SETTLE_MS,
  DEVOTIONAL_COLLAPSE_THRESHOLD,
  DEVOTIONAL_COLLAPSE_TRAVEL_PX,
  DEVOTIONAL_STOP_EXIT_MS,
  DEVOTIONAL_STOP_HOLD_MS,
  DEVOTIONAL_STOP_SPREAD_MS,
  devotionalPlayerTheme,
} from '@/lib/devotional-player-theme';
import { mix } from '@/lib/color-themes';
import { useBiblePalette } from './bible-v205/palette';
import { useTabBarOccupiedHeight } from './app-tab-bar';
import { WavyProgress } from './wavy-progress';

const KEEP_AWAKE_TAG = 'devotional-listen';

/** The v4 demo's settle curve — Material emphasized. */
const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);

/** The pill's seat, shared with components/devotional-pill.tsx:
 * 14px sides, 66px tall, `tabBarHeight + 10` off the bottom. */
const PILL_SIDE = 14;
const PILL_HEIGHT = 66;

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

  // Load this chapter's devotional into the shared player. A different
  // chapter replaces the source and plays; the same chapter (a reopen
  // from the pill) is left exactly as it is.
  useEffect(() => {
    openDevotional(devotional, devotionalAudioFor(devotional.book, devotional.chapter));
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
    if (expandMorph) {
      collapseP.value = withTiming(0, { duration: DEVOTIONAL_COLLAPSE_SETTLE_MS, easing: EMPHASIZED });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pillBottom = tabBarHeight + 10;
  const pillTop = screenH - pillBottom - PILL_HEIGHT;

  const goBack = () => {
    onBackRef.current();
  };

  const settleCollapse = (toPill: boolean) => {
    collapseP.value = withTiming(toPill ? 1 : 0, { duration: DEVOTIONAL_COLLAPSE_SETTLE_MS, easing: EMPHASIZED }, (finished) => {
      if (finished && toPill) runOnJS(goBack)();
    });
  };

  const minimize = () => settleCollapse(true);

  // Dragging down scrubs the morph with the finger (the v4 demo:
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
          collapseP.value = Math.min(
            1,
            Math.max(0, dragStartP.current + g.dy / DEVOTIONAL_COLLAPSE_TRAVEL_PX),
          );
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
    const node = stopBtnRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x: number, y: number, w: number, h: number) =>
        runStopSequence(x + w / 2, y + h / 2),
      );
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

  const contentStyle = useAnimatedStyle(() => {
    const p = collapseP.value;
    return {
      opacity: interpolate(p, [0, 0.45], [1, 0]),
      transform: [
        { translateY: interpolate(p, [0, 1], [0, 56]) },
        { scale: interpolate(p, [0, 1], [1, 0.96]) },
      ],
    };
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseP.value, [0, 0.3], [1, 0]),
  }));

  const pillFaceStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapseP.value, [0.6, 1], [0, 1]),
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

  const tileBg = mix(theme.track, theme.ground, 0.45);

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
        <Animated.View style={[styles.page, contentStyle]}>
          {/* Concept 2 header: eyebrow context, the numeral hero,
              the title as plain type, the commentary line. */}
          <Text style={[styles.eyebrow, { color: theme.accent }]}>
            {devotional.book} · Chapter {devotional.chapter}
          </Text>
          <Text style={[styles.numeral, { color: theme.primary }]}>{devotional.chapter}</Text>
          <Text style={[styles.title, { color: theme.ink }]}>{devotional.title}</Text>
          <Text style={[styles.sub, { color: theme.accent }]}>
            {formatClock(devotional.durationSec)} · a reading of his commentary
          </Text>

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
            <Text style={[styles.time, { color: theme.accent }]}>{formatClock(position)}</Text>
            <Text style={[styles.time, { color: theme.accent }]}>{formatClock(duration)}</Text>
          </View>

          {/* ONE controls row: the filled-tonal Stop pill, the big
              primary circular play. */}
          <View style={styles.controls}>
            <Pressable
              ref={stopBtnRef}
              onPress={stop}
              style={[styles.stopBtn, { backgroundColor: theme.stopSeat }]}
              accessibilityLabel="Stop"
            >
              <MaterialIcons name="stop" size={15} color={theme.accent} />
              <Text style={[styles.stopText, { color: theme.accent }]}>Stop</Text>
            </Pressable>
            <Pressable
              onPress={toggleDevotionalPlayback}
              style={[styles.playBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
              accessibilityLabel={playing ? 'Pause' : ended ? 'Play again' : 'Play'}
            >
              <MaterialIcons
                name={playing ? 'pause' : ended ? 'replay' : 'play-arrow'}
                size={30}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* The words — only where a transcript exists (none yet for
              the Genesis narrations; the follow-along arrives with
              them). Seated quietly below, as before. */}
          {devotional.paragraphs.map((text, i) => {
            const state = i === activeIdx ? 'active' : i < activeIdx ? 'done' : 'next';
            return (
              <View
                key={i}
                onLayout={(e) => {
                  paraY.current[i] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.para,
                  state === 'active'
                    ? { backgroundColor: theme.stopSeat, borderLeftColor: theme.primary }
                    : { borderLeftColor: 'transparent' },
                ]}
              >
                <Text
                  style={[
                    styles.paraText,
                    { color: state === 'done' ? theme.inkSoft : theme.ink, opacity: state === 'next' ? 0.75 : 1 },
                  ]}
                >
                  {text}
                </Text>
              </View>
            );
          })}
          {devotional.paragraphs.length > 0 ? (
            <Text style={[styles.foot, { color: theme.inkSoft }]}>
              The words follow the reading by proportion — listen, and read along.
            </Text>
          ) : null}
          <Text style={[styles.hint, { color: theme.inkSoft }]}>
            Swipe down to keep listening while you study
          </Text>
        </Animated.View>
      </ScrollView>

      {/* The top of the page: no solid bar — content meets a soft
          gradient fade (the app-wide page rule), and the chevron
          tile rides over it. The chevron runs the same collapse
          morph for non-gesture users. */}
      <View pointerEvents="none" style={[styles.topFade, { height: insets.top + 84 }]}>
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
      <Animated.View style={[styles.topRow, { paddingTop: insets.top + 8 }, headerStyle]}>
        <Pressable
          onPress={minimize}
          hitSlop={10}
          style={[styles.chevronTile, { backgroundColor: tileBg }]}
          accessibilityLabel="Minimize player"
        >
          <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.ink} />
        </Pressable>
      </Animated.View>

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
            {devotional.book} {devotional.chapter} · Devotional
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
  page: { paddingHorizontal: 20, paddingTop: 76, paddingBottom: 40 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginTop: 26 },
  numeral: { fontSize: 100, fontWeight: '800', lineHeight: 104, marginTop: 8 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 29, marginTop: 16 },
  sub: { fontSize: 12.5, fontWeight: '600', marginTop: 8 },
  seekTouch: { marginTop: 30, height: 30, justifyContent: 'center' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { fontSize: 11.5, fontWeight: '700' },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 22 },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18 },
  stopText: { fontSize: 13, fontWeight: '700' },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginLeft: 'auto',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  para: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  paraText: { fontSize: 17, lineHeight: 26 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 18 },
  topFade: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 16 },
  chevronTile: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
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
