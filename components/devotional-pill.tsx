// ─── Devotional pill (v293) ─────────────────────────────────────────────────
// The minimized player: a pill riding above the tab bar while a
// devotional session is live, so the narration keeps playing while he
// moves through the Bible section (or anywhere) studying. Mounted once
// at the root (app/_layout.tsx); it renders only while
// lib/devotional-player.ts holds a session, and hides itself while
// the full player screen is open.
//
// Controls: play/pause and STOP on the pill itself (Stop ends the
// session entirely — the pill unmounts). Tap the pill, or swipe it
// up, to bring the full player back.

import { useMemo } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  stopDevotional,
  toggleDevotionalPlayback,
  useDevotionalPlayerState,
} from '@/lib/devotional-player';
import { useBiblePalette } from './bible-v205/palette';
import { useTabBarOccupiedHeight } from './app-tab-bar';
import { WavyProgress } from './wavy-progress';

export function DevotionalPill() {
  const playerState = useDevotionalPlayerState();
  const pathname = usePathname();
  const router = useRouter();
  const palette = useBiblePalette();
  const tabBarHeight = useTabBarOccupiedHeight();

  const devotional = playerState.devotional;

  const expand = () => {
    if (!devotional) return;
    router.push({
      pathname: '/devotional',
      params: { book: devotional.book, chapter: String(devotional.chapter) },
    });
  };

  // Swipe up to expand (a tap on the body does the same).
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, g) => g.dy < -18 && Math.abs(g.dy) > Math.abs(g.dx) * 1.6,
        onPanResponderRelease: (_e, g) => {
          if (g.dy < -36) expand();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devotional?.book, devotional?.chapter],
  );

  if (!devotional || pathname === '/devotional') return null;

  const progress =
    playerState.durationSec > 0 ? Math.min(1, playerState.positionSec / playerState.durationSec) : 0;

  return (
    <View
      style={[styles.wrap, { bottom: tabBarHeight + 10 }]}
      {...pan.panHandlers}
      pointerEvents="box-none"
    >
      <View style={[styles.pill, { backgroundColor: palette.paper2 }, palette.cardDress]}>
        <Pressable
          onPress={toggleDevotionalPlayback}
          hitSlop={6}
          style={[styles.playBtn, { backgroundColor: palette.rasp }]}
          accessibilityLabel={playerState.playing ? 'Pause devotional' : 'Play devotional'}
        >
          <MaterialIcons name={playerState.playing ? 'pause' : 'play-arrow'} size={20} color="#FFFFFF" />
        </Pressable>
        <Pressable onPress={expand} style={styles.body} accessibilityLabel="Open devotional player">
          <Text style={[styles.where, { color: palette.inkSoft }]} numberOfLines={1}>
            {devotional.book} · Chapter {devotional.chapter}
          </Text>
          <Text style={[styles.title, { color: palette.ink }]} numberOfLines={1}>
            {devotional.title}
          </Text>
        </Pressable>
        <Pressable
          onPress={stopDevotional}
          hitSlop={8}
          style={styles.iconBtn}
          accessibilityLabel="Stop devotional"
        >
          <MaterialIcons name="stop" size={20} color={palette.inkSoft} />
        </Pressable>
        <Pressable onPress={expand} hitSlop={8} style={styles.iconBtn} accessibilityLabel="Expand player">
          <MaterialIcons name="keyboard-arrow-up" size={22} color={palette.inkSoft} />
        </Pressable>
        {/* v339: the pill's playback line wears the wavy fill
            (his Oct 29 ruling) — same seat and colours. */}
        <View style={styles.progressTrack}>
          <WavyProgress value={progress} color={palette.rasp} trackColor={palette.band} height={8} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14, zIndex: 60 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    overflow: 'hidden',
  },
  playBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  where: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  title: { fontSize: 13, fontWeight: '700', marginTop: 1 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  progressTrack: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
