// ─── v214 "Living Bubble" — faces in the margin that bloom into notes ───────
// The locked spec is the approved interactive mockup (Concept 3 of
// bible-note-bubbles.html), copied number for number:
//  · a 34px face sits in the entry's right margin; a press morphs the
//    face ITSELF into the note card — 380ms on the mockup's
//    cubic-bezier(0.22, 1, 0.36, 1) in the default skin (material
//    skins speak their own settle dialect through skinMotion), no
//    bounce, no spring, no overshoot;
//  · the card grows from the face's spot over the verses, its radius
//    easing 50% → 16px, a soft shadow lifting in, the words fading /
//    rising in a beat behind the shape (~32%→95% of the morph);
//  · 2+ notes open as a CONVERSATION — cards arrive one beat apart
//    (110ms stagger), alternating sides (first left, next right),
//    and closing folds them back in reverse order;
//  · a barely-there scrim (5% ink) dims the entry behind an open
//    thread; pressing the card, its ×, or the scrim folds it back.
// Amendment (his asks, 2026-10-23 18:04): a long conversation scrolls
// INTERNALLY once the bloom settles — capped at the visible area,
// shifted up so the whole region stays on screen — and the Android
// back action closes an open thread instead of leaving the page
// (the handler lives in the chapter page, which owns the open key).

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ReAnimated, {
  interpolate,
  makeMutable,
  useAnimatedStyle,
  withDelay,
  withTiming,
  type EasingFunction,
  type EasingFunctionFactory,
  type SharedValue,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AvatarImage } from '@/components/avatar-system';
import type { Person } from '@/lib/prayercircle-data';
import {
  conversationShiftUp,
  conversationViewport,
  resolveBubbleAuthor,
  type BubbleKind,
  type BubbleLine,
  type BubblePiece,
  type ProfileIdentity,
  type ResolvedAuthor,
} from '@/lib/bible-v205/bubbles';
import type { LineAuthor } from '@/lib/bible-v205/marks';
import type { BiblePalette } from './palette';

export const FACE_SIZE = 34;
const SOLO_CARD_W = 276;
const CONVO_CARD_W = 250;
const CARD_GAP = 10;
const STACK_STEP = 19;
const ANCHOR_TOP = 12;
const STAGGER_MS = 110;

export type BloomTiming = { duration: number; easing: EasingFunction | EasingFunctionFactory };

export function kindLabelFor(kind: BubbleKind): string {
  return kind === 'highlight' ? '✦ Highlight' : kind === 'thought' ? 'Main Thought' : 'Note';
}

/** "on v. 34" / "on vv. 11–12" — the span a card's verses ride on. */
export function spanLabelFor(start: number, end: number): string {
  return start === end ? `on v. ${start}` : `on vv. ${start}–${end}`;
}

const SNAPSHOT_COLORS = ['#2E8C7A', '#B45BC2', '#E0643C', '#1F5F8B', '#96791A', '#6D3BBF'];

function snapshotColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SNAPSHOT_COLORS[h % SNAPSHOT_COLORS.length];
}

/** One author's face: their current People photo/avatar, the profile
 * face for his own lines, or an initial disc (a person's own color,
 * or a snapshot disc for someone no longer in the list). */
export function AuthorFace({
  author,
  size,
  palette,
}: {
  author: ResolvedAuthor;
  size: number;
  palette: BiblePalette;
}) {
  if (author.isSelf) {
    return (
      <AvatarImage
        id="profile"
        name={author.name}
        avatarAsset={author.avatarAsset}
        photoUri={author.photoUri}
        size={size}
        fallbackColor={palette.rasp}
      />
    );
  }
  if (author.person) {
    const p = author.person;
    return (
      <AvatarImage
        id={p.id}
        name={p.name}
        gender={p.gender}
        avatarAsset={p.avatarAsset}
        photoUri={p.photoUri}
        size={size}
        fallbackColor={p.avatarColor}
      />
    );
  }
  // Snapshot: the person is gone from the list; the name the line was
  // stored with carries the face.
  const initial = author.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: snapshotColor(author.name),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.44 }}>{initial}</Text>
    </View>
  );
}

function cardColors(kind: BubbleKind, palette: BiblePalette): { bg: string; border: string; ink: string; label: string } {
  if (kind === 'highlight') {
    return { bg: palette.yellowBg, border: palette.yellowBorder, ink: palette.yellowInk, label: palette.yellowLabel };
  }
  if (kind === 'thought') {
    return { bg: palette.greyBg, border: palette.greyBorder, ink: palette.greyInk, label: palette.greyLabel };
  }
  return { bg: palette.paper, border: palette.isDark ? palette.lineDark : '#E4DFEA', ink: palette.ink, label: palette.rasp };
}

// ─── One morphing card ───────────────────────────────────────────────────────

function MorphCard(props: {
  index: number;
  count: number;
  line: BubbleLine;
  author: ResolvedAuthor;
  palette: BiblePalette;
  progress: SharedValue<number>;
  cardW: number;
  closedRight: number;
  openRight: number;
  openTop: number;
  naturalHeight: number;
  spanText: string | null;
  onPressCard: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onMeasure: (height: number) => void;
}) {
  const { line, palette, progress } = props;
  const colors = cardColors(line.kind, palette);

  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      width: interpolate(p, [0, 1], [FACE_SIZE, props.cardW]),
      height: interpolate(p, [0, 1], [FACE_SIZE, Math.max(FACE_SIZE, props.naturalHeight)]),
      borderRadius: interpolate(p, [0, 1], [FACE_SIZE / 2, 16]),
      top: interpolate(p, [0, 1], [props.index * 3, props.openTop]),
      right: interpolate(p, [0, 1], [props.closedRight, props.openRight]),
      shadowOpacity: interpolate(p, [0, 1], [0.18, 0.3]),
    };
  }, [props.cardW, props.naturalHeight, props.openTop, props.closedRight, props.openRight, props.index]);

  // The words land a beat behind the shape — and leave before it
  // when folding (the same interpolation read in reverse).
  const contentStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0.32, 0.95], [0, 1]),
      transform: [{ translateY: interpolate(p, [0.3, 1], [6, 0]) }],
    };
  }, []);
  const seedStyle = useAnimatedStyle(() => {
    return { opacity: interpolate(progress.value, [0, 0.42], [1, 0]) };
  }, []);

  return (
    <ReAnimated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          zIndex: 26 + props.index,
        },
        cardStyle,
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onPressCard} />
      {/* The card's own content, laid out at full card width from the
          start (the mockup's trick) so its measured height is the
          height the morph grows to. */}
      <ReAnimated.View
        style={[styles.cardIn, { width: props.cardW }, contentStyle]}
        pointerEvents="box-none"
        onLayout={(e) => props.onMeasure(e.nativeEvent.layout.height)}
      >
        <View style={styles.cardHead}>
          <AuthorFace author={props.author} size={24} palette={palette} />
          <Text style={[styles.cardName, { color: colors.ink }]} numberOfLines={1}>
            {props.author.name}
          </Text>
          <Text style={[styles.cardKind, { color: colors.label }]}>{kindLabelFor(line.kind).toUpperCase()}</Text>
          {props.spanText ? <Text style={[styles.cardSpan, { color: colors.ink }]}>{props.spanText}</Text> : null}
        </View>
        <Text style={[styles.cardText, { color: colors.ink }]}>{line.text}</Text>
        <View style={styles.cardActions} pointerEvents="box-none">
          <Pressable hitSlop={6} onPress={props.onEdit} style={styles.cardActionBtn}>
            <MaterialIcons name="edit" size={15} color={colors.ink} style={{ opacity: 0.6 }} />
          </Pressable>
          <Pressable hitSlop={6} onPress={props.onRemove} style={styles.cardActionBtn}>
            <MaterialIcons name="delete-outline" size={16} color={colors.ink} style={{ opacity: 0.6 }} />
          </Pressable>
          <Pressable hitSlop={6} onPress={props.onPressCard} style={styles.cardActionBtn}>
            <MaterialIcons name="close" size={16} color={colors.ink} style={{ opacity: 0.6 }} />
          </Pressable>
        </View>
      </ReAnimated.View>
      {/* The face itself, riding the card's top corner — the seed the
          card blooms from. It fades as the card's header takes over. */}
      <ReAnimated.View style={[styles.seed, seedStyle]} pointerEvents="none">
        <AuthorFace author={props.author} size={FACE_SIZE} palette={palette} />
      </ReAnimated.View>
    </ReAnimated.View>
  );
}

// ─── The layer: faces + conversation, in the entry's right margin ────────────

export function LivingBubbles(props: {
  piece: BubblePiece;
  people: Person[];
  profile: ProfileIdentity;
  palette: BiblePalette;
  open: boolean;
  bloom: BloomTiming;
  /** The visible area the overlay may use, from the chapter page. */
  viewportHeight: number;
  topChrome: number;
  bottomReserve: number;
  /** The entry container's top edge in viewport coordinates
   * (null until the page has laid out). */
  entryScreenTop: number | null;
  onToggle: (open: boolean) => void;
  onEditLine: (lineIndex: number) => void;
  onRemoveLine: (lineIndex: number) => void;
}) {
  const { piece, palette, open } = props;
  const lines = piece.lines;
  const count = lines.length;
  const solo = count <= 1;
  const cardW = solo ? SOLO_CARD_W : CONVO_CARD_W;
  const window = useWindowDimensions();
  const [stripW, setStripW] = useState(window.width - 40);
  const [heights, setHeights] = useState<number[]>(() => lines.map(() => 120));
  const [scrollReady, setScrollReady] = useState(false);

  const progresses = useMemo(() => lines.map(() => makeMutable(0)), [count]); // eslint-disable-line react-hooks/exhaustive-deps
  const appliedRef = useRef<{ open: boolean; progresses: SharedValue<number>[] } | null>(null);

  useEffect(() => {
    const last = appliedRef.current;
    if (last && last.open === open && last.progresses === progresses) return;
    appliedRef.current = { open, progresses };
    const cfg = { duration: props.bloom.duration, easing: props.bloom.easing };
    progresses.forEach((p, i) => {
      if (open) {
        p.value = withDelay(i * STAGGER_MS, withTiming(1, cfg));
      } else {
        // Reverse order: the last message folds first.
        p.value = withDelay((count - 1 - i) * STAGGER_MS, withTiming(0, cfg));
      }
    });
    if (open) {
      // Scrolling unlocks only once the bloom has settled — the
      // morph never fights a scroll offset (his amendment).
      const total = props.bloom.duration + (count - 1) * STAGGER_MS + 60;
      const t = setTimeout(() => setScrollReady(true), total);
      return () => clearTimeout(t);
    }
    setScrollReady(false);
    return undefined;
  }, [open, count, progresses, props.bloom.duration, props.bloom.easing]);

  const natural = heights.reduce((a, b) => a + b, 0) + CARD_GAP * Math.max(0, count - 1);
  const { regionHeight, scrollable } = conversationViewport({
    naturalHeight: natural,
    viewportHeight: props.viewportHeight,
    topChrome: props.topChrome,
    bottomReserve: props.bottomReserve,
  });
  const shift = open
    ? conversationShiftUp({
        anchorTop: ANCHOR_TOP,
        entryScreenTop: props.entryScreenTop ?? 0,
        regionHeight,
        viewportHeight: props.viewportHeight,
        topChrome: props.topChrome,
        bottomReserve: props.bottomReserve,
      })
    : 0;
  const closedRegionH = FACE_SIZE + 3 * Math.max(0, count - 1) + 2;

  const regionStyle = useAnimatedStyle(() => {
    const p = progresses[0]?.value ?? 0;
    return {
      height: interpolate(p, [0, 1], [closedRegionH, regionHeight]),
      top: interpolate(p, [0, 1], [ANCHOR_TOP, ANCHOR_TOP - shift]),
    };
  }, [closedRegionH, regionHeight, shift]);

  const openTops: number[] = [];
  {
    let acc = 0;
    for (let i = 0; i < count; i++) {
      openTops.push(acc);
      acc += heights[i] + CARD_GAP;
    }
  }
  // The mockup's span stamp: a piece that is a proper subset of the
  // entry it was split from names the verses its cards ride on.
  const showSpan = piece.start !== piece.parentStart || piece.end !== piece.parentEnd;
  const spanText = showSpan ? spanLabelFor(piece.start, piece.end) : null;

  return (
    <>
      {open ? (
        <Pressable
          style={[styles.scrim, { backgroundColor: 'rgba(33,29,26,0.05)' }]}
          onPress={() => props.onToggle(false)}
        />
      ) : null}
      <ReAnimated.ScrollView
        style={[styles.region, regionStyle]}
        contentContainerStyle={{ height: natural, position: 'relative' }}
        scrollEnabled={open && scrollReady && scrollable}
        showsVerticalScrollIndicator={open && scrollable}
        onLayout={(e) => setStripW(e.nativeEvent.layout.width)}
        pointerEvents={open && scrollable ? 'auto' : 'box-none'}
      >
        {lines.map((line, i) => {
          const closedRight = solo ? 0 : (count - 1 - i) * STACK_STEP;
          const openRight = solo ? 0 : line.side === 'left' ? Math.max(0, stripW - cardW) : 0;
          return (
            <MorphCard
              key={`${line.kind}-${line.fieldIndex}-${i}`}
              index={i}
              count={count}
              line={line}
              author={resolveBubbleAuthor(line.author, props.people, props.profile)}
              palette={palette}
              progress={progresses[i]}
              cardW={cardW}
              closedRight={closedRight}
              openRight={openRight}
              openTop={openTops[i]}
              naturalHeight={heights[i]}
              spanText={spanText}
              onPressCard={() => props.onToggle(!open)}
              onEdit={() => props.onEditLine(i)}
              onRemove={() => props.onRemoveLine(i)}
              onMeasure={(h) =>
                setHeights((prev) => {
                  if (Math.abs((prev[i] ?? 0) - h) < 1) return prev;
                  const next = [...prev];
                  next[i] = h;
                  return next;
                })
              }
            />
          );
        })}
      </ReAnimated.ScrollView>
    </>
  );
}

// ─── Stories: the same bubbles as chat rows (no bloom in Stories) ───────────

export function BubbleChatRow({
  line,
  author,
  palette,
  flip,
}: {
  line: BubbleLine;
  author: ResolvedAuthor;
  palette: BiblePalette;
  flip: boolean;
}) {
  const colors = cardColors(line.kind, palette);
  return (
    <View style={[styles.chatRow, flip ? styles.chatRowFlip : null]}>
      <AuthorFace author={author} size={34} palette={palette} />
      <View
        style={[
          styles.chatBubble,
          flip ? styles.chatBubbleFlip : null,
          { backgroundColor: colors.bg, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.chatHead, { color: colors.label }]}>
          <Text style={{ color: colors.ink, fontSize: 12 }}>{author.name}</Text>
          {'  ·  '}
          {kindLabelFor(line.kind).toUpperCase()}
        </Text>
        <Text style={[styles.chatText, { color: colors.ink }]}>{line.text}</Text>
      </View>
    </View>
  );
}

// ─── The composer's "Who said this?" picker ──────────────────────────────────

export function AuthorPicker({
  people,
  profile,
  value,
  palette,
  onChange,
}: {
  people: Person[];
  profile: ProfileIdentity;
  /** null = Me (the default). */
  value: LineAuthor | null;
  palette: BiblePalette;
  onChange: (author: LineAuthor | null) => void;
}) {
  const chip = (selected: boolean) => [
    styles.authorChip,
    {
      borderColor: selected ? palette.rasp : palette.line,
      backgroundColor: selected ? palette.band : palette.paper,
    },
  ];
  return (
    <View style={styles.authorPicker}>
      <Text style={[styles.authorLabel, { color: palette.inkFaint }]}>Who said this?</Text>
      <View style={styles.authorRow}>
        <Pressable style={chip(value === null)} onPress={() => onChange(null)}>
          <AuthorFace
            author={{
              name: profile.name || 'You',
              person: null,
              isSelf: true,
              isSnapshot: false,
              photoUri: profile.photoUri,
              avatarAsset: profile.avatarAsset,
            }}
            size={20}
            palette={palette}
          />
          <Text style={[styles.authorChipText, { color: palette.ink }]}>
            {profile.name ? profile.name.split(/\s+/)[0] : 'Me'}
          </Text>
          <Text style={[styles.authorDefault, { color: palette.rasp }]}>DEFAULT</Text>
        </Pressable>
        {people.map((person) => {
          const selected = value?.authorId === person.id;
          return (
            <Pressable
              key={person.id}
              style={chip(selected)}
              onPress={() => onChange({ authorId: person.id, authorName: person.name })}
            >
              <AuthorFace
                author={{ name: person.name, person, isSelf: false, isSnapshot: false }}
                size={20}
                palette={palette}
              />
              <Text style={[styles.authorChipText, { color: palette.ink }]}>{person.name.split(/\s+/)[0]}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 14 },
  region: { position: 'absolute', left: 0, right: 0, zIndex: 26 },
  card: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: 'rgba(50,25,35,1)',
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 8,
  },
  cardIn: { paddingTop: 11, paddingHorizontal: 13, paddingBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  cardName: { fontSize: 12.5, fontWeight: '800', flexShrink: 1 },
  cardKind: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  cardSpan: { fontSize: 10, fontWeight: '700', opacity: 0.6 },
  cardText: { fontSize: 13.3, lineHeight: 20, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 6 },
  cardActionBtn: { padding: 4 },
  seed: { position: 'absolute', top: 0, right: 0 },
  chatRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginTop: 11 },
  chatRowFlip: { flexDirection: 'row-reverse' },
  chatBubble: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 15,
    borderTopLeftRadius: 4,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },
  chatBubbleFlip: { borderTopLeftRadius: 15, borderTopRightRadius: 4 },
  chatHead: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, marginBottom: 3 },
  chatText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  authorPicker: { marginTop: 10 },
  authorLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 7 },
  authorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  authorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  authorChipText: { fontSize: 12.5, fontWeight: '700' },
  authorDefault: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.8 },
});
