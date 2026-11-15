// ─── The devotional Share group (v536) ──────────────────────────────────────
// Five quiet tonal buttons in the chapter devotional player's
// scroll column, under the controls (Jonathan, Nov 15): Audio
// (the chapter's own file), Square card, Story card, Square
// video, Story video — the cards and videos drawn by the native
// maker from the one card model (lib/devotional-share.ts) into
// the app's CACHE, never the downloads store. A tap generates
// its artifact if needed (the group wears a quiet working state
// while it does — a video encode runs as long as it runs), then
// opens the system share sheet. A failure says so plainly under
// the buttons; nothing ever reports a share that did not
// happen. Chapter sessions only — the listen view never mounts
// this group for a Ten Stops tour.

import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Devotional } from '../lib/devotionals';
import { useDevotionalDownloadState } from '../lib/devotional-download';
import {
  DEVOTIONAL_SHARE_BUTTONS,
  devotionalShareAudioAvailable,
  generateAndShareDevotionalArtifact,
  type DevotionalShareKind,
} from '../lib/devotional-share';

/** The five buttons' glyphs — drawn, never emoji: a music note
 * for the audio file itself, a framed picture for the cards
 * (square / tall), a frame with a play triangle for the videos.
 * Built from plain Views on purpose: the group mounts inside
 * the listen view, whose test rigs (and older devices' svg
 * surfaces) do not all carry the same react-native-svg export
 * set, while a View renders everywhere the player does. */
function ShareKindIcon({ kind, color }: { kind: DevotionalShareKind; color: string }) {
  const frame = (tall: boolean) => (
    <View
      style={[
        styles.iconFrame,
        tall ? styles.iconFrameTall : styles.iconFrameSquare,
        { borderColor: color },
      ]}
    />
  );
  const play = (small: boolean) => (
    <View
      style={[
        styles.iconPlay,
        small ? styles.iconPlaySmall : styles.iconPlayBig,
        { borderLeftColor: color },
      ]}
    />
  );
  switch (kind) {
    case 'audio':
      return (
        <View style={styles.iconBox}>
          <View style={[styles.iconNoteStem, { backgroundColor: color }]} />
          <View style={[styles.iconNoteStemFar, { backgroundColor: color }]} />
          <View style={[styles.iconNoteBeam, { backgroundColor: color }]} />
          <View style={[styles.iconNoteHead, { backgroundColor: color }]} />
          <View style={[styles.iconNoteHeadFar, { backgroundColor: color }]} />
        </View>
      );
    case 'square-card':
      return (
        <View style={styles.iconBox}>
          {frame(false)}
          <View style={[styles.iconSun, { backgroundColor: color }]} />
          <View style={[styles.iconHill, { backgroundColor: color }]} />
        </View>
      );
    case 'story-card':
      return (
        <View style={styles.iconBox}>
          {frame(true)}
          <View style={[styles.iconSunTall, { backgroundColor: color }]} />
          <View style={[styles.iconHillTall, { backgroundColor: color }]} />
        </View>
      );
    case 'square-video':
      return (
        <View style={styles.iconBox}>
          {frame(false)}
          {play(false)}
        </View>
      );
    case 'story-video':
      return (
        <View style={styles.iconBox}>
          {frame(true)}
          {play(true)}
        </View>
      );
  }
}

export const DevotionalShareGroup = memo(function DevotionalShareGroup(props: {
  devotional: Devotional;
  primary: string;
  accent: string;
  stopSeat: string;
  inkSoft: string;
}) {
  const { devotional } = props;
  // The Audio door reads the disk truth through the download
  // store: it stands only while the chapter's file is on this
  // phone (in the player that is the standing case — a chapter
  // session plays its downloaded file — but the group checks
  // rather than assumes, and follows the state as it changes).
  useDevotionalDownloadState(devotional);
  const audioAvailable = devotionalShareAudioAvailable(devotional);

  const [working, setWorking] = useState<DevotionalShareKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onShare = useCallback(
    async (kind: DevotionalShareKind) => {
      if (working) return;
      setWorking(kind);
      setError(null);
      try {
        await generateAndShareDevotionalArtifact(kind, devotional);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That share could not be made.');
      } finally {
        setWorking(null);
      }
    },
    [working, devotional],
  );

  return (
    <View style={styles.group}>
      <Text style={[styles.heading, { color: props.primary }]}>SHARE</Text>
      <View style={styles.row}>
        {DEVOTIONAL_SHARE_BUTTONS.map((button) => {
          const disabled =
            working !== null || (button.kind === 'audio' && !audioAvailable);
          const isWorking = working === button.kind;
          return (
            <Pressable
              key={button.kind}
              onPress={() => void onShare(button.kind)}
              disabled={disabled}
              style={[
                styles.btn,
                { backgroundColor: props.stopSeat, opacity: disabled && !isWorking ? 0.45 : 1 },
              ]}
              accessibilityLabel={`Share ${button.label}`}
              accessibilityState={{ disabled, busy: isWorking }}
            >
              {isWorking ? (
                <ActivityIndicator size="small" color={props.accent} />
              ) : (
                <ShareKindIcon kind={button.kind} color={props.accent} />
              )}
              <Text style={[styles.btnText, { color: props.accent }]}>{button.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text style={[styles.error, { color: props.inkSoft }]}>{error}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  // The panel family's seat (the guideposts' marginTop) and its
  // heading dress, without the panel ground — the group is a
  // quiet row of doors, not another card.
  group: { marginTop: 18 },
  heading: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  btnText: { fontSize: 14, fontWeight: '700' },
  error: { fontSize: 12.5, marginTop: 10 },
  // The glyph box every icon composes inside (15px, matching
  // the chips' type scale).
  iconBox: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFrame: {
    position: 'absolute',
    borderWidth: 1.6,
    borderRadius: 3,
  },
  iconFrameSquare: { width: 13, height: 13 },
  iconFrameTall: { width: 9.5, height: 14 },
  // The picture glyphs' sun (a filled dot, upper left inside
  // the frame) and ground line (a short bar along the bottom).
  iconSun: {
    position: 'absolute',
    left: 3.4,
    top: 3.4,
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  iconHill: {
    position: 'absolute',
    left: 3.4,
    bottom: 3.2,
    width: 6.5,
    height: 1.8,
    borderRadius: 1,
  },
  iconSunTall: {
    position: 'absolute',
    left: 4.1,
    top: 3,
    width: 2.6,
    height: 2.6,
    borderRadius: 1.3,
  },
  iconHillTall: {
    position: 'absolute',
    left: 4.1,
    bottom: 2.8,
    width: 4.6,
    height: 1.6,
    borderRadius: 1,
  },
  // The play triangle, drawn with borders.
  iconPlay: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 1,
  },
  iconPlayBig: {
    borderTopWidth: 3.4,
    borderBottomWidth: 3.4,
    borderLeftWidth: 5.8,
  },
  iconPlaySmall: {
    borderTopWidth: 2.8,
    borderBottomWidth: 2.8,
    borderLeftWidth: 4.8,
  },
  // The music note: two stems, a slanted beam across their
  // tops, and a rounded head at each stem's foot.
  iconNoteStem: {
    position: 'absolute',
    left: 3.4,
    top: 3.4,
    width: 1.7,
    height: 8.6,
  },
  iconNoteStemFar: {
    position: 'absolute',
    right: 2.2,
    top: 2.2,
    width: 1.7,
    height: 8.6,
  },
  iconNoteBeam: {
    position: 'absolute',
    left: 3.2,
    top: 2.9,
    width: 9.6,
    height: 2.4,
    borderRadius: 1,
    transform: [{ rotate: '-13deg' }],
  },
  iconNoteHead: {
    position: 'absolute',
    left: 0.9,
    bottom: 1.2,
    width: 4.6,
    height: 3.6,
    borderRadius: 2,
    transform: [{ rotate: '-16deg' }],
  },
  iconNoteHeadFar: {
    position: 'absolute',
    right: 0.4,
    bottom: 2.4,
    width: 4.6,
    height: 3.6,
    borderRadius: 2,
    transform: [{ rotate: '-16deg' }],
  },
});
