// ─── Devotional listen screen (v230) ────────────────────────────────────────
// "Something on the screen that will keep people occupied" while the
// devotional plays: his words, in large readable paragraphs, following the
// audio by PROPORTION (character-length-weighted — see lib/devotionals.ts;
// this is deliberately NOT word-sync, and no UI copy claims otherwise).
//
// Playback is FOREGROUND-ONLY in this build: no background audio mode is
// configured; leaving the screen unloads the player. Keep-awake holds while
// the screen is open and playing, and is released on pause/unmount.

import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { activeParagraphIndex, formatClock, type Devotional } from '@/lib/devotionals';
import { devotionalAudioFor } from '@/lib/devotional-audio';
import { useBiblePalette } from './bible-v205/palette';
import { Ornament } from './bible-v205/blocks';

const KEEP_AWAKE_TAG = 'devotional-listen';

export function DevotionalListenView(props: { devotional: Devotional; onBack: () => void }) {
  const { devotional } = props;
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const player = useAudioPlayer(devotionalAudioFor(devotional.book, devotional.chapter) ?? undefined, {
    updateInterval: 250,
  });
  const status = useAudioPlayerStatus(player);

  const duration = status.duration > 0 ? status.duration : devotional.durationSec;
  const position = Math.min(status.currentTime, duration);
  const ended = duration > 0 && position >= duration - 0.25 && !status.playing;
  const activeIdx = activeParagraphIndex(position, duration, devotional.paragraphs);

  // Keep the screen awake while listening; release the moment we pause,
  // finish, or leave.
  useEffect(() => {
    if (status.playing) {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    } else {
      deactivateKeepAwake(KEEP_AWAKE_TAG);
    }
    return () => {
      void deactivateKeepAwake(KEEP_AWAKE_TAG);
    };
  }, [status.playing]);

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

  const toggle = () => {
    if (status.playing) {
      player.pause();
    } else if (ended) {
      player.seekTo(0);
      player.play();
    } else {
      player.play();
    }
  };

  const seek = (fraction: number) => {
    if (duration > 0) player.seekTo(Math.max(0, Math.min(1, fraction)) * duration);
  };

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={props.onBack} hitSlop={10} style={styles.topBtn}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]} numberOfLines={1}>
          {devotional.book} · Chapter {devotional.chapter}
        </Text>
        <View style={styles.topBtn} />
      </View>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={styles.page}>
        {/* Header card — calm, skin-dressed; no bespoke art in this pilot. */}
        <View style={styles.header}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>Devotional</Text>
          <Text style={[styles.title, { color: palette.ink }]}>{devotional.title}</Text>
          <Ornament palette={palette} />
          <Text style={[styles.sub, { color: palette.inkSoft }]}>
            {formatClock(devotional.durationSec)} · in his own voice
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={toggle}
            style={[styles.playBtn, { backgroundColor: palette.rasp }]}
            accessibilityLabel={status.playing ? 'Pause' : ended ? 'Play again' : 'Play'}
          >
            <MaterialIcons
              name={status.playing ? 'pause' : ended ? 'replay' : 'play-arrow'}
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
              <View
                style={[
                  styles.fill,
                  { backgroundColor: palette.rasp, width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
                ]}
              />
            </Pressable>
            <View style={styles.times}>
              <Text style={[styles.time, { color: palette.inkSoft }]}>{formatClock(position)}</Text>
              <Text style={[styles.time, { color: palette.inkSoft }]}>{formatClock(duration)}</Text>
            </View>
          </View>
        </View>

        {/* The words — proportion-follow, honestly not word-sync. */}
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
        <Text style={[styles.foot, { color: palette.inkSoft }]}>
          The words follow the reading by proportion — listen, and read along.
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
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 22 },
  playBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  seekWrap: { flex: 1 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  time: { fontSize: 11, fontWeight: '600' },
  para: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  paraText: { fontSize: 17, lineHeight: 26 },
  foot: { fontSize: 11, textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});
