// ─── The devotional Share group (v536; seat rebuilt v541) ───────────────────
// The shares from the chapter devotional player (Jonathan,
// Nov 15): Audio (the chapter's own file), Square card, Story
// card, Square video, Story video — the cards and videos drawn
// by the native maker from the one card model
// (lib/devotional-share.ts) into the app's CACHE, never the
// downloads store. A tap generates its artifact if needed
// (the group wears a quiet working state while it does — a
// video encode runs as long as it runs), then opens the system
// share sheet. A failure says so plainly under the group;
// nothing ever reports a share that did not happen. Chapter
// sessions only — the listen view never mounts this group for
// a Ten Stops tour.
//
// v541 — the seat is Concept 2 "Kind first" (mockup
// player-share-cleanup-v1; Jonathan's pick, Nov 15: "Just use
// concept 2 from here"), ported as drawn: the SHARE heading,
// then one segmented bar — Audio | Card | Video — in the
// player's own family derivation, then the picked kind's two
// shapes as outlined boxes (icon on top, the shape's name, its
// sub-line). Audio is an action in the bar, not a selection:
// it shares at a tap and shows no variants. The five shares
// themselves — generation, dress, cache rule — are v536's,
// untouched; only the seat changed.

import { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Devotional } from '../lib/devotionals';
import { useDevotionalDownloadState } from '../lib/devotional-download';
import {
  DEVOTIONAL_SHARE_BUTTONS,
  DEVOTIONAL_SHARE_DEFAULT_KIND,
  DEVOTIONAL_SHARE_GROUP_SEGMENTS,
  devotionalShareAudioAvailable,
  generateAndShareDevotionalArtifact,
  shareGroupVariants,
  shareVariantName,
  shareVariantSubLabel,
  type DevotionalShareGroupKind,
  type DevotionalShareKind,
  type DevotionalShareVariantKind,
} from '../lib/devotional-share';

/** The five shares' labels, from the model's standing list. */
function shareLabel(kind: DevotionalShareKind): string {
  return DEVOTIONAL_SHARE_BUTTONS.find((b) => b.kind === kind)?.label ?? kind;
}

/** A frame outline drawn from a plain View, with an optional
 * play triangle centred in it. Plain Views on purpose: the
 * group mounts inside the listen view, whose test rigs (and
 * older devices' svg surfaces) do not all carry the same
 * react-native-svg export set, while a View renders everywhere
 * the player does (the v536 lesson, kept). */
function FrameGlyph(props: {
  width: number;
  height: number;
  borderWidth: number;
  color: string;
  play?: { top: number; left: number };
}) {
  return (
    <View
      style={{
        width: props.width,
        height: props.height,
        borderWidth: props.borderWidth,
        borderRadius: 3.5,
        borderColor: props.color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {props.play ? (
        <View
          style={[
            styles.playTri,
            {
              borderLeftColor: props.color,
              borderTopWidth: props.play.top,
              borderBottomWidth: props.play.top,
              borderLeftWidth: props.play.left,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** The music note — two stems, a slanted beam across their
 * tops, and a rounded head at each stem's foot (the v536 glyph,
 * unchanged). */
function NoteGlyph({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.iconNoteStem, { backgroundColor: color }]} />
      <View style={[styles.iconNoteStemFar, { backgroundColor: color }]} />
      <View style={[styles.iconNoteBeam, { backgroundColor: color }]} />
      <View style={[styles.iconNoteHead, { backgroundColor: color }]} />
      <View style={[styles.iconNoteHeadFar, { backgroundColor: color }]} />
    </View>
  );
}

/** A segment's glyph (the drawing's 15px seat): the note for
 * Audio, a wide frame for Card, the frame with its play
 * triangle for Video. */
function SegmentIcon({ segment, color }: { segment: DevotionalShareGroupKind; color: string }) {
  switch (segment) {
    case 'audio':
      return <NoteGlyph color={color} />;
    case 'card':
      return <FrameGlyph width={15} height={12} borderWidth={1.6} color={color} />;
    case 'video':
      return (
        <FrameGlyph width={15} height={12} borderWidth={1.6} color={color} play={{ top: 2.8, left: 4.8 }} />
      );
  }
}

/** A variant box's glyph (the drawing's 22px seat): the
 * shape's frame, with the play triangle for the videos. */
function VariantIcon({ kind, color }: { kind: DevotionalShareKind; color: string }) {
  switch (kind) {
    case 'square-card':
      return <FrameGlyph width={20} height={20} borderWidth={2} color={color} />;
    case 'story-card':
      return <FrameGlyph width={13.5} height={20} borderWidth={2} color={color} />;
    case 'square-video':
      return <FrameGlyph width={20} height={20} borderWidth={2} color={color} play={{ top: 3.8, left: 6.4 }} />;
    case 'story-video':
      return <FrameGlyph width={13.5} height={20} borderWidth={2} color={color} play={{ top: 3.2, left: 5.4 }} />;
    case 'audio':
      return <NoteGlyph color={color} />;
  }
}

export const DevotionalShareGroup = memo(function DevotionalShareGroup(props: {
  devotional: Devotional;
  primary: string;
  accent: string;
  stopSeat: string;
  panel: string;
  track: string;
  ink: string;
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

  // The picked kind — screen-local, opening on Card (the
  // drawing's selected segment), never persisted. Audio never
  // sits here: it is an action, not a selection.
  const [kind, setKind] = useState<DevotionalShareVariantKind>(DEVOTIONAL_SHARE_DEFAULT_KIND);
  const [working, setWorking] = useState<DevotionalShareKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onShare = useCallback(
    async (shareKind: DevotionalShareKind) => {
      if (working) return;
      setWorking(shareKind);
      setError(null);
      try {
        await generateAndShareDevotionalArtifact(shareKind, devotional);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'That share could not be made.');
      } finally {
        setWorking(null);
      }
    },
    [working, devotional],
  );

  const variants = shareGroupVariants(kind);

  return (
    <View style={styles.group}>
      <Text style={[styles.heading, { color: props.primary }]}>SHARE</Text>
      <View style={[styles.segTrack, { backgroundColor: props.stopSeat }]}>
        {DEVOTIONAL_SHARE_GROUP_SEGMENTS.map((segment) => {
          if (segment.kind === 'audio') {
            // The Audio segment: a tap shares the file itself,
            // at once — no variants, no selection. It dims
            // while the file is not on this phone.
            const disabled = !audioAvailable;
            const isWorking = working === 'audio';
            return (
              <Pressable
                key={segment.kind}
                onPress={() => void onShare('audio')}
                disabled={disabled}
                style={[styles.seg, { opacity: disabled ? 0.45 : 1 }]}
                accessibilityLabel="Share Audio"
                accessibilityState={{ disabled, busy: isWorking }}
              >
                {isWorking ? (
                  <ActivityIndicator size="small" color={props.accent} />
                ) : (
                  <SegmentIcon segment="audio" color={props.accent} />
                )}
                <Text style={[styles.segText, { color: props.accent }]}>{segment.label}</Text>
              </Pressable>
            );
          }
          const selected = kind === segment.kind;
          const content = selected ? '#FFFFFF' : props.accent;
          return (
            <Pressable
              key={segment.kind}
              onPress={() => setKind(segment.kind as DevotionalShareVariantKind)}
              style={[
                styles.seg,
                selected && { backgroundColor: props.primary, shadowColor: props.primary },
                selected && styles.segSelected,
              ]}
              accessibilityLabel={segment.label}
              accessibilityState={{ selected }}
            >
              <SegmentIcon segment={segment.kind} color={content} />
              <Text style={[styles.segText, { color: content }]}>{segment.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.variants}>
        {variants.map((variantKind) => {
          const isWorking = working === variantKind;
          const disabled = working !== null;
          return (
            <Pressable
              key={variantKind}
              onPress={() => void onShare(variantKind)}
              disabled={disabled}
              style={[
                styles.variant,
                {
                  backgroundColor: props.panel,
                  borderColor: props.track,
                  opacity: disabled && !isWorking ? 0.45 : 1,
                },
              ]}
              accessibilityLabel={`Share ${shareLabel(variantKind)}`}
              accessibilityState={{ disabled, busy: isWorking }}
            >
              <View style={styles.variantIconSeat}>
                {isWorking ? (
                  <ActivityIndicator size="small" color={props.accent} />
                ) : (
                  <VariantIcon kind={variantKind} color={props.primary} />
                )}
              </View>
              <Text style={[styles.variantName, { color: props.ink }]}>
                {shareVariantName(variantKind)}
              </Text>
              <Text style={[styles.variantSub, { color: props.inkSoft }]}>
                {shareVariantSubLabel(variantKind)}
              </Text>
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
  // quiet set of doors, not another card.
  group: { marginTop: 18 },
  heading: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  // The segmented bar (the drawing's): a tonal track, pill
  // round, its three segments sharing it evenly.
  segTrack: {
    flexDirection: 'row',
    borderRadius: 22,
    padding: 4,
    marginTop: 6,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 18,
    paddingVertical: 9,
  },
  // The selected segment's soft lift, as drawn (its fill is
  // the family primary, set inline).
  segSelected: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  segText: { fontSize: 13.5, fontWeight: '600' },
  // The variant boxes (the drawing's): two across, outlined,
  // the icon over the name over the sub-line.
  variants: { flexDirection: 'row', gap: 10, marginTop: 12 },
  variant: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingTop: 13,
    paddingBottom: 11,
  },
  variantIconSeat: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  variantName: { fontSize: 13, fontWeight: '600' },
  variantSub: { fontSize: 11, marginTop: 1 },
  error: { fontSize: 12.5, marginTop: 10 },
  // The glyph box the note composes inside (15px, matching
  // the segments' type scale).
  iconBox: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The play triangle, drawn with borders.
  playTri: {
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 1,
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
