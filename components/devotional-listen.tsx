// ─── Devotional player screen (v230 → v293) ────────────────────────────────
// The full player for a chapter's devotional: title, chapter, big
// play/pause, progress, a STOP that ends the session entirely — and a
// swipe down (or the chevron) that MINIMIZES it to the pill
// (components/devotional-pill.tsx) without stopping the narration.
//
// Playback lives in the shared controller (lib/devotional-player.ts),
// not in this screen: leaving the screen never unloads the player.
// The words on screen, where a transcript exists, follow the audio by
// PROPORTION (character-length-weighted — see lib/devotionals.ts; NOT
// word-sync, and no UI copy claims otherwise). The Genesis narrations
// carry no transcript yet, so for them the screen is player-only.

import { useEffect, useMemo, useRef } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { activeParagraphIndex, devotionalKey, formatClock, type Devotional } from '@/lib/devotionals';
import { devotionalAudioFor } from '@/lib/devotional-audio';
import {
  devotionalEnded,
  openDevotional,
  seekDevotional,
  stopDevotional,
  toggleDevotionalPlayback,
  useDevotionalPlayerState,
} from '@/lib/devotional-player';
import { useBiblePalette } from './bible-v205/palette';
import { WavyProgress } from './wavy-progress';
import { Ornament } from './bible-v205/blocks';

const KEEP_AWAKE_TAG = 'devotional-listen';

export function DevotionalListenView(props: { devotional: Devotional; onBack: () => void }) {
  const { devotional } = props;
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const playerState = useDevotionalPlayerState();

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
  useEffect(() => {
    const y = paraY.current[activeIdx];
    if (typeof y === 'number') {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
    }
  }, [activeIdx]);

  // Swipe down to minimize to the pill. Only a clear downward drag
  // claims the gesture, so taps, the seek bar, and ordinary scrolling
  // keep working.
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => g.dy > 24 && g.dy > Math.abs(g.dx) * 1.6,
        onPanResponderRelease: (_e, g) => {
          if (g.dy > 60) props.onBack();
        },
      }),
    [props],
  );

  const stop = () => {
    stopDevotional();
    props.onBack();
  };

  const seek = (fraction: number) => {
    if (duration > 0) seekDevotional(Math.max(0, Math.min(1, fraction)) * duration);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }} {...pan.panHandlers}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={props.onBack}
          hitSlop={10}
          style={styles.topBtn}
          accessibilityLabel="Minimize player"
        >
          <MaterialIcons name="keyboard-arrow-down" size={24} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]} numberOfLines={1}>
          {devotional.book} · Chapter {devotional.chapter}
        </Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.page}>
        {/* Header card — calm, skin-dressed; no bespoke art. */}
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>Devotional</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{devotional.title}</Text>
          <Ornament palette={palette} />
          <Text style={[styles.sub, { color: palette.inkSoft }]}>
            {formatClock(devotional.durationSec)} · a reading of his commentary
          </Text>
        </View>

        {/* Controls: play/pause, the seek track, and Stop. */}
        <View style={styles.controls}>
          <Pressable
            onPress={toggleDevotionalPlayback}
            style={[styles.playBtn, { backgroundColor: palette.rasp }]}
            accessibilityLabel={playing ? 'Pause' : ended ? 'Play again' : 'Play'}
          >
            <MaterialIcons
              name={playing ? 'pause' : ended ? 'replay' : 'play-arrow'}
              size={30}
              color="#FFFFFF"
            />
          </Pressable>
          <View style={styles.seekWrap}>
            <Pressable
              style={[styles.track, { backgroundColor: palette.band }]}
              onPress={(e) => {
                if (trackWidth.current > 0) seek(e.nativeEvent.locationX / trackWidth.current);
              }}
              onLayout={(e) => {
                trackWidth.current = e.nativeEvent.layout.width;
              }}
            >
              {/* v339: the seek fill wears the wave (his Oct 29
                  ruling) — same seat and colour; the Pressable's
                  tap-to-seek is unchanged. */}
              <WavyProgress value={duration > 0 ? position / duration : 0} color={palette.rasp} trackColor="transparent" height={8} hideStopDot />
            </Pressable>
            <View style={styles.times}>
              <Text style={[styles.time, { color: palette.inkSoft }]}>{formatClock(position)}</Text>
              <Text style={[styles.time, { color: palette.inkSoft }]}>{formatClock(duration)}</Text>
            </View>
          </View>
          <Pressable
            onPress={stop}
            style={[styles.stopBtn, { borderColor: palette.lineDark }]}
            accessibilityLabel="Stop"
          >
            <MaterialIcons name="stop" size={22} color={palette.ink} />
            <Text style={[styles.stopText, { color: palette.ink }]}>Stop</Text>
          </Pressable>
        </View>

        {/* The words — only where a transcript exists (none yet for the
            Genesis narrations; the follow-along arrives with them). */}
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
                  ? { backgroundColor: palette.raspTint, borderLeftColor: palette.rasp }
                  : { borderLeftColor: 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.paraText,
                  { color: state === 'done' ? palette.inkSoft : palette.ink, opacity: state === 'next' ? 0.75 : 1 },
                ]}
              >
                {text}
              </Text>
            </View>
          );
        })}
        {devotional.paragraphs.length > 0 ? (
          <Text style={[styles.foot, { color: palette.inkSoft }]}>
            The words follow the reading by proportion — listen, and read along.
          </Text>
        ) : null}
        <Text style={[styles.hint, { color: palette.inkFaint }]}>
          Swipe down to keep listening while you study
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  topBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700' },
  page: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 18 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  sub: { fontSize: 12, marginTop: 6 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 22 },
  playBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  stopBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10 },
  stopText: { fontSize: 12, fontWeight: '700' },
  seekWrap: { flex: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  time: { fontSize: 11, fontWeight: '600' },
  para: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  paraText: { fontSize: 17, lineHeight: 26 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
  hint: { fontSize: 11, textAlign: 'center', marginTop: 18 },
});
