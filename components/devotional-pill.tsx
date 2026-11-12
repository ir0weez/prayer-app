// ─── Devotional pill (v293 → v497) ─────────────────────────────────────────
// The app-wide mini player: root-mounted in app/_layout.tsx, it
// shows whenever a devotional session is live and the full player
// route is not open. Tapping it (or swiping up) returns to the
// full player; its Stop ends the session.
//
// v512: "the full player is not open" is now the controller's own
// fact (lib/devotional-player's view-open registration, driven by
// the listen view's mount/unmount), NOT the router's pathname —
// the pathname gate is what left Jonathan's phone (Nov 12) with
// the audio playing and no pill anywhere after a drag-collapse.
//
// v497 is the approved rebuild (mockups devotional-player-concepts
// v5/v7/v8, his picks across NOV 11): the pill wears design P1 —
// the WHOLE pill filled with the book's deep primary (a same-family
// gradient, radius 999, real elevation), a white play disc inset
// left with the book colour's icon, the title in white over the
// "{Book} {chapter} · Devotional" context in quieter white, and
// quiet white Stop / chevron seats at the right. Its life is
// treatment 6, THE FILL: a deeper shade of the book colour
// advances behind ALL the content (disc, words, icons ride on
// top), its width the played fraction, its leading edge the v8
// drawing's wavy vertical SVG edge — which drifts slowly on its
// 2.1s cycle WHILE PLAYING and freezes when paused. The old
// bottom-edge wavy line is gone; the fill is the progress now.
//
// Colours derive per book via lib/devotional-player-theme.ts
// (Genesis instance: gradient #A83212 → #8F270D, fill-deep
// #671806). Stop on the pill runs his sequence, pill-scale: the
// deepest stop spreads from the Stop seat across the pill
// (380ms), holds (250ms), the pill slides away sideways (400ms),
// and only then does the session clear. Expanding asks the full
// player to open through the collapse morph in reverse
// (requestDevotionalExpandMorph), so the two surfaces read as one
// object; when the full player closes into this seat through the
// v499 morph, the hand-off flag (consumeDevotionalPillHandoff)
// suppresses any settle replay — the pill is simply there.

import { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  consumeDevotionalPillHandoff,
  requestDevotionalExpandMorph,
  stopDevotional,
  toggleDevotionalPlayback,
  useDevotionalPlayerState,
  useDevotionalPlayerViewOpen,
} from '@/lib/devotional-player';
import { devotionalContextLine } from '@/lib/devotionals';
import {
  DEVOTIONAL_FILL_DRIFT_MS,
  DEVOTIONAL_FILL_DRIFT_PX,
  DEVOTIONAL_FILL_EDGE_PATH,
  DEVOTIONAL_STOP_EXIT_MS,
  DEVOTIONAL_STOP_HOLD_MS,
  DEVOTIONAL_STOP_SPREAD_MS,
  devotionalFillFraction,
  devotionalPlayerTheme,
} from '@/lib/devotional-player-theme';
import { useBiblePalette } from './bible-v205/palette';
import { useTabBarOccupiedHeight } from './app-tab-bar';

const EMPHASIZED = Easing.bezier(0.2, 0, 0, 1);
const PILL_HEIGHT = 66;

export function DevotionalPill() {
  const state = useDevotionalPlayerState();
  const palette = useBiblePalette();
  // v512: the pill stands on the CONTROLLER's facts alone — a
  // live session and no open player view (the listen view
  // registers its openness in lib/devotional-player on mount /
  // unmount). It no longer reads the router's pathname: on
  // Jonathan's phone the drag-collapse closed the player and
  // the audio played on, but the pill — gated on the pathname
  // flipping away from the player route — never stood.
  const playerViewOpen = useDevotionalPlayerViewOpen();
  const router = useRouter();
  const tabBarHeight = useTabBarOccupiedHeight();

  const devotional = state.devotional;
  const theme = devotionalPlayerTheme(devotional?.book ?? 'Genesis', palette.isDark);
  const progress = devotionalFillFraction(state.positionSec, state.durationSec);

  const [pillW, setPillW] = useState(0);
  const [stopping, setStopping] = useState(false);
  const stoppingRef = useRef(false);

  // Settle-in: the pill lands in its seat with the last few frames
  // of the full player's collapse morph (scale .97 → 1, a 6px
  // rise, 180ms) whenever it mounts.
  const settle = useSharedValue(0);
  useEffect(() => {
    settle.value = withTiming(1, { duration: 180, easing: EMPHASIZED });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // v499 hand-off, re-seated v512: the pill is root-mounted and
  // merely renders nothing while the player view is open, so the
  // hand-off lands on the view's close — the controller's
  // view-open fact flipping back to false, which EVERY close path
  // produces (the listen view's unmount cleanup), pathname never
  // consulted. When the full player's morph settled into this
  // seat, the listen view raised the flag just before its route
  // closed; consuming it here snaps the settle to its end state —
  // the morph surface already landed wearing this pill's geometry
  // exactly, so the pill simply IS there and never replays an
  // arrival. The flag only ever suppresses the settle replay; it
  // has never gated whether the pill stands, and still doesn't.
  const wasPlayerOpenRef = useRef(false);
  useEffect(() => {
    if (playerViewOpen) {
      wasPlayerOpenRef.current = true;
      return;
    }
    if (wasPlayerOpenRef.current) {
      wasPlayerOpenRef.current = false;
      if (consumeDevotionalPillHandoff()) {
        cancelAnimation(settle);
        settle.value = 1;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerViewOpen]);

  // The Fill's edge drift: a slow 2.1s sine while playing, frozen
  // where it stands when paused (v8's pause rule).
  const drift = useSharedValue(0);
  useEffect(() => {
    if (state.playing) {
      drift.value = withRepeat(
        withTiming(1, { duration: DEVOTIONAL_FILL_DRIFT_MS, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(drift);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.playing]);

  const expand = () => {
    if (!devotional || stoppingRef.current) return;
    requestDevotionalExpandMorph();
    // A book-level tour (v501) has no chapter params to pass — the
    // route resolves it from the live session instead, the seat it
    // already has for exactly this landing.
    if (devotional.bookLevel) {
      router.push({ pathname: '/devotional', params: {} });
      return;
    }
    router.push({
      pathname: '/devotional',
      params: { book: devotional.book, chapter: String(devotional.chapter) },
    });
  };

  // Swipe up on the pill also returns to the full player.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => g.dy < -14 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -36) expand();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devotional],
  );

  // ── Stop: spread → hold → slide away → clear ──────────────────
  const spread = useSharedValue(0);
  const spreadCx = useSharedValue(0);
  const spreadCy = useSharedValue(0);
  const spreadMax = useSharedValue(0);
  const exitP = useSharedValue(0);
  const pillRef = useRef<any>(null);
  const stopSeatRef = useRef<any>(null);

  const finishStop = () => {
    stopDevotional();
  };

  const runStopSequence = (cx: number, cy: number) => {
    spreadCx.value = cx;
    spreadCy.value = cy;
    spreadMax.value =
      2 *
      Math.max(
        Math.hypot(cx, cy),
        Math.hypot(pillW - cx, cy),
        Math.hypot(cx, PILL_HEIGHT - cy),
        Math.hypot(pillW - cx, PILL_HEIGHT - cy),
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
    const seat = stopSeatRef.current;
    const pill = pillRef.current;
    if (seat && pill && typeof seat.measureInWindow === 'function' && typeof pill.measureInWindow === 'function') {
      seat.measureInWindow((sx: number, sy: number, sw: number, sh: number) => {
        pill.measureInWindow((px: number, py: number) => {
          runStopSequence(sx - px + sw / 2, sy - py + sh / 2);
        });
      });
    } else {
      runStopSequence(Math.max(0, pillW - 62), PILL_HEIGHT / 2);
    }
  };

  const bodyStyle = useAnimatedStyle(() => ({
    opacity: interpolate(settle.value, [0, 1], [0.55, 1]) * (1 - exitP.value * 0.6),
    transform: [
      { translateY: interpolate(settle.value, [0, 1], [6, 0]) },
      { scale: interpolate(settle.value, [0, 1], [0.97, 1]) },
      { translateX: exitP.value * (pillW + 48) },
    ],
  }));

  const edgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(drift.value, [0, 1], [-DEVOTIONAL_FILL_DRIFT_PX, DEVOTIONAL_FILL_DRIFT_PX]) }],
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

  if (!devotional || playerViewOpen) return null;

  const edgeLeft = progress * pillW - 8;

  return (
    <View style={[styles.wrap, { bottom: tabBarHeight + 10 }]} {...pan.panHandlers} pointerEvents="box-none">
      <Animated.View
        ref={pillRef}
        style={[styles.body, { shadowColor: theme.fillDeep }, bodyStyle]}
        onLayout={(e) => setPillW(e.nativeEvent.layout.width)}
      >
        {/* P1 body: the same-family gradient fill. */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            <Defs>
              <LinearGradient id="devotionalPillGradient" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.pillFrom} />
                <Stop offset="1" stopColor={theme.pillTo} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#devotionalPillGradient)" />
          </Svg>
        </View>

        {/* THE FILL: the deepest stop advancing behind everything,
            its wavy leading edge drifting while playing. */}
        {progress > 0 ? (
          <View
            pointerEvents="none"
            style={[styles.fillLayer, { width: `${progress * 100}%`, backgroundColor: theme.fillDeep }]}
          />
        ) : null}
        {progress > 0.001 && progress < 0.999 && pillW > 0 ? (
          <Animated.View pointerEvents="none" style={[styles.fillEdge, { left: edgeLeft }, edgeStyle]}>
            <Svg width={16} height={PILL_HEIGHT + 8} viewBox="0 0 16 66" preserveAspectRatio="none">
              <Path d={DEVOTIONAL_FILL_EDGE_PATH} fill={theme.fillDeep} />
            </Svg>
          </Animated.View>
        ) : null}

        {/* Stop spread (his sequence): the deepest stop spreads
            from the Stop seat across the whole pill. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.spread, { backgroundColor: theme.fillDeep }, spreadStyle]}
        />

        {/* Content — rides on top of the fill. */}
        <View style={styles.row}>
          <Pressable
            onPress={toggleDevotionalPlayback}
            style={styles.disc}
            accessibilityLabel={state.playing ? 'Pause' : 'Play'}
          >
            <MaterialIcons name={state.playing ? 'pause' : 'play-arrow'} size={20} color={theme.primary} />
          </Pressable>
          <Pressable style={styles.txt} onPress={expand} accessibilityLabel="Open the full player">
            <Text style={styles.title} numberOfLines={1}>
              {devotional.title}
            </Text>
            <Text style={styles.ctx} numberOfLines={1}>
              {devotionalContextLine(devotional)}
            </Text>
          </Pressable>
          <Pressable
            ref={stopSeatRef}
            onPress={stop}
            style={styles.seat}
            accessibilityLabel="Stop"
            disabled={stopping}
          >
            <MaterialIcons name="stop" size={15} color="rgba(255,255,255,0.88)" />
          </Pressable>
          <Pressable onPress={expand} style={styles.seat} accessibilityLabel="Expand player">
            <MaterialIcons name="keyboard-arrow-up" size={19} color="rgba(255,255,255,0.88)" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 40 },
  body: {
    height: PILL_HEIGHT,
    borderRadius: 999,
    overflow: 'hidden',
    shadowOpacity: 0.4,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  fillLayer: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  fillEdge: { position: 'absolute', top: -4, width: 16, height: PILL_HEIGHT + 8 },
  spread: { position: 'absolute', zIndex: 1 },
  row: {
    position: 'relative',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    height: PILL_HEIGHT,
    paddingLeft: 14,
    paddingRight: 8,
  },
  disc: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txt: { flex: 1, marginLeft: 12 },
  title: { fontSize: 13.5, fontWeight: '600', color: '#FFFFFF' },
  ctx: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.68)', marginTop: 1 },
  seat: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
