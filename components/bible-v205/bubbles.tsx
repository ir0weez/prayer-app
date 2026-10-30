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
// v244 "Bubbles, Floating Right" (his asks, 2026-10-25 10:09): the
// faces grow (34 → 51) and lose the SQUARE shadow that sat on them —
// the old card carried elevation + shadow in its static style while
// its borderRadius lived only in the animated style, so the shadow
// silhouette stayed rectangular; the closed face now wears its own
// round, soft shadow on a statically-round seed, the card's shadow
// fades in only as it blooms, and the stack drifts on a slow sine —
// buoyed, staggered per face, never synchronized, no springs. The
// open bubble goes BIG (~92% of the screen, still a bubble), docks
// BELOW its verses (above only when the room is up there), and the
// chapter behind it BLURS for real (expo-blur) everywhere except the
// verses zone itself, which stays crisp. Studio quote blocks that
// carry a speaker id join the margin as quote bubbles (edited in the
// studio — no pencil here).
// v249 "Scroll While It's Open" (his rulings, 2026-10-25 15:17 +
// 15:21): the page is no longer scroll-locked while a thread is open
// (the lock lived in the chapter page) — the whole layer already
// rides in the page's content coordinates, anchored to its entry, so
// it scrolls with the chapter and stays on its verses. A quick tap
// anywhere outside the open cards folds the thread (the blur strips,
// plus a catcher over the thread's own band for the slivers beside
// the cards); a drag is the page's scroll, never a tap — every close
// path here is a plain Pressable onPress, which the page ScrollView's
// gesture negotiation cancels the moment a drag becomes a scroll.
// The faces also get a dependable hit target of their own: a real
// Pressable over the closed stack (below), so a tap on a face can
// never leak through to the verse row's toggle, and every toggle in
// this layer is a SET (open means open, close means close) — a press
// landing mid-bloom re-aims the morph at the last intent instead of
// racing it. And the open card's corner radius now lives in its
// STATIC style too: on Android the elevation shadow's silhouette is
// drawn from the static outline, so the animated-only radius left
// the shadow SQUARE — grey patches at the card's bottom corners
// (the same disease the seed's static radius cured in v244).

import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import ReAnimated, {
  Easing,
  interpolate,
  makeMutable,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type EasingFunction,
  type EasingFunctionFactory,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AvatarImage } from '@/components/avatar-system';
import type { Person } from '@/lib/prayercircle-data';
import {
  bubbleDock,
  conversationViewport,
  faceStackHitBox,
  openCardWidth,
  resolveBubbleAuthor,
  type BubbleKind,
  type BubbleLine,
  type BubblePiece,
  type ProfileIdentity,
  type ResolvedAuthor,
} from '@/lib/bible-v205/bubbles';
import type { LineAuthor } from '@/lib/bible-v205/marks';
import type { BiblePalette } from './palette';

export const FACE_SIZE = 51;
const CARD_GAP = 10;
const STACK_STEP = 28;
/** The closed stack's vertical cascade step (each face sits 3px
 * below the one above it — the morph's closed `top` per index). */
const STACK_TOP_STEP = 3;
const ANCHOR_TOP = 12;
const STAGGER_MS = 110;
/** The open thread's clearance from the verses it hangs on. */
const DOCK_GAP = 8;
/** The chapter blur's strength while a thread is open. */
const BLUR_INTENSITY = 45;

export type BloomTiming = { duration: number; easing: EasingFunction | EasingFunctionFactory };

export function kindLabelFor(kind: BubbleKind): string {
  return kind === 'highlight'
    ? '✦ Highlight'
    : kind === 'thought'
      ? 'Main Thought'
      : kind === 'quote'
        ? '❝ Quote'
        : 'Note';
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
  if (kind === 'thought' || kind === 'quote') {
    // A quote wears the same grey family as its v223 callout did —
    // someone else's words, kept distinct from his highlight gold.
    return { bg: palette.greyBg, border: palette.greyBorder, ink: palette.greyInk, label: palette.greyLabel };
  }
  return { bg: palette.paper, border: palette.isDark ? palette.lineDark : palette.line, ink: palette.ink, label: palette.rasp };
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

  // v244: the idle float — a slow sine drift on the closed face,
  // staggered per face (delay + period both step with the index) so
  // the stack reads as buoyed, never synchronized. It fades out as
  // the bloom takes the card (the (1 − p) factor below), and it
  // never starts at all under reduced motion.
  const drift = useSharedValue(0);
  const driftIndex = props.index;
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (!live || reduced) return;
        drift.value = withDelay(
          driftIndex * 450,
          withRepeat(
            withTiming(1, { duration: 2300 + driftIndex * 350, easing: Easing.inOut(Easing.sin) }),
            -1,
            true,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [drift, driftIndex]);

  const cardStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      width: interpolate(p, [0, 1], [FACE_SIZE, props.cardW]),
      height: interpolate(p, [0, 1], [FACE_SIZE, Math.max(FACE_SIZE, props.naturalHeight)]),
      borderRadius: interpolate(p, [0, 1], [FACE_SIZE / 2, 16]),
      top: interpolate(p, [0, 1], [props.index * STACK_TOP_STEP, props.openTop]),
      right: interpolate(p, [0, 1], [props.closedRight, props.openRight]),
      // v244: NO shadow at rest (the seed wears the face's own round
      // shadow) — the card's big soft shadow fades in with the bloom.
      shadowOpacity: interpolate(p, [0, 1], [0, 0.3]),
      shadowRadius: interpolate(p, [0, 1], [6, 22]),
      elevation: interpolate(p, [0, 1], [0, 8]),
      transform: [{ translateY: interpolate(drift.value, [0, 1], [3, -3]) * (1 - p) }],
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
          <AuthorFace author={props.author} size={28} palette={palette} />
          <Text style={[styles.cardName, { color: colors.ink }]} numberOfLines={1}>
            {props.author.name}
          </Text>
          <Text style={[styles.cardKind, { color: colors.label }]}>{kindLabelFor(line.kind).toUpperCase()}</Text>
          {props.spanText ? <Text style={[styles.cardSpan, { color: colors.ink }]}>{props.spanText}</Text> : null}
        </View>
        <Text style={[styles.cardText, { color: colors.ink }]}>{line.text}</Text>
        <View style={styles.cardActions} pointerEvents="box-none">
          {/* v244: a studio quote is read here, not edited — its words
              live in the studio pack, so it gets no pencil or trash,
              only the fold-back ×. */}
          {line.source !== 'quote' ? (
            <>
              <Pressable hitSlop={6} onPress={props.onEdit} style={styles.cardActionBtn}>
                <MaterialIcons name="edit" size={15} color={colors.ink} style={{ opacity: 0.6 }} />
              </Pressable>
              <Pressable hitSlop={6} onPress={props.onRemove} style={styles.cardActionBtn}>
                <MaterialIcons name="delete-outline" size={16} color={colors.ink} style={{ opacity: 0.6 }} />
              </Pressable>
            </>
          ) : null}
          <Pressable hitSlop={6} onPress={props.onPressCard} style={styles.cardActionBtn}>
            <MaterialIcons name="close" size={16} color={colors.ink} style={{ opacity: 0.6 }} />
          </Pressable>
        </View>
      </ReAnimated.View>
      {/* The face itself, riding the card's top corner — the seed the
          card blooms from. It fades as the card's header takes over.
          v244: the seed wears the face's shadow — statically round
          (borderRadius in the style sheet, not the animated style),
          soft and small — so the closed face's shadow follows its
          circle on both platforms. */}
      <ReAnimated.View style={[styles.seed, { backgroundColor: colors.bg }, seedStyle]} pointerEvents="none">
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
  /**
   * v244: the entry-relative y where this entry's verses end (the
   * chapter page measures its head). The open thread docks below it
   * — the verses stay on screen, uncovered and unblurred — or above
   * the entry when the room is up there. Null until measured.
   */
  versesBottom: number | null;
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
  const window = useWindowDimensions();
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

  const [stripW, setStripW] = useState(window.width - 40);
  // v244: the open cards go BIG — ~92% of the screen for a lone
  // bubble, ~86% in a conversation so the alternation still reads,
  // and never wider than the strip they are laid out in.
  const cardW = openCardWidth({ solo, windowWidth: window.width, stripWidth: stripW });

  const natural = heights.reduce((a, b) => a + b, 0) + CARD_GAP * Math.max(0, count - 1);
  const { regionHeight, scrollable } = conversationViewport({
    naturalHeight: natural,
    viewportHeight: props.viewportHeight,
    topChrome: props.topChrome,
    bottomReserve: props.bottomReserve,
  });
  // v244: the dock — below the verses by default (they stay visible,
  // uncovered, unblurred), above the entry when the room is up
  // there. The region's open top lands the whole thread on its dock;
  // the cards keep their cumulative tops inside it.
  const headBottom = props.versesBottom ?? ANCHOR_TOP + FACE_SIZE + 6;
  const dock = bubbleDock({
    entryScreenTop: props.entryScreenTop,
    versesBottom: headBottom,
    cardsHeight: natural,
    viewportHeight: props.viewportHeight,
    topChrome: props.topChrome,
    bottomReserve: props.bottomReserve,
    gap: DOCK_GAP,
  });
  const openRegionTop = dock === 'below' ? headBottom + DOCK_GAP : -(regionHeight + DOCK_GAP);
  const closedRegionH = FACE_SIZE + STACK_TOP_STEP * Math.max(0, count - 1) + 2;

  const regionStyle = useAnimatedStyle(() => {
    const p = progresses[0]?.value ?? 0;
    return {
      height: interpolate(p, [0, 1], [closedRegionH, regionHeight]),
      top: interpolate(p, [0, 1], [ANCHOR_TOP, openRegionTop]),
    };
  }, [closedRegionH, regionHeight, openRegionTop]);

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

  // v249: every toggle in this layer is a SET, never a flip of the
  // possibly-stale `open` prop — a press is an intent ("open" /
  // "close"), and the chapter page's key either already says it
  // (idempotent: the drive effect below dedupes on the prop it last
  // applied) or moves to it, re-aiming any in-flight morph from its
  // current progress. Rapid taps converge on the last intent; no
  // press can reverse a bloom by re-reading a state the previous
  // press already changed.
  const requestToggle = (next: boolean) => props.onToggle(next);

  // v244: while a thread is open the chapter behind it BLURS — two
  // expo-blur strips, one from the screen's top down to this entry,
  // one from the foot of its verses to the screen's bottom. The
  // verses zone between them is never covered: the verses stay
  // crisp and readable while everything else softens. A tap on
  // either strip folds the thread back (the v214 scrim's job, kept).
  // v249: the page scrolls while the thread is open, and the strips
  // ride in content coordinates with it — so each strip over-covers
  // by a screenful (the top strip reaches a screen ABOVE the
  // viewport's top at open time, the bottom strip runs two screens
  // down), keeping the greyout and the tap-to-close whole across a
  // screen of scroll travel in either direction.
  const blurTint = palette.isDark ? 'dark' : 'light';
  // v249: the closed stack's tap target — the union of the cascade.
  const hitBox = faceStackHitBox({
    count,
    faceSize: FACE_SIZE,
    stackStepX: STACK_STEP,
    stackStepY: STACK_TOP_STEP,
  });
  return (
    <>
      {open ? (
        <>
          {props.entryScreenTop !== null && props.entryScreenTop > 0 ? (
            <Pressable
              style={[
                styles.blurStrip,
                {
                  top: -(props.entryScreenTop + window.height),
                  height: props.entryScreenTop + window.height,
                  left: -20,
                  width: window.width,
                },
              ]}
              onPress={() => requestToggle(false)}
            >
              <BlurView intensity={BLUR_INTENSITY} tint={blurTint} style={StyleSheet.absoluteFill} />
            </Pressable>
          ) : null}
          <Pressable
            style={[styles.blurStrip, { top: headBottom, height: window.height * 2, left: -20, width: window.width }]}
            onPress={() => requestToggle(false)}
          >
            <BlurView intensity={BLUR_INTENSITY} tint={blurTint} style={StyleSheet.absoluteFill} />
          </Pressable>
          {/* v249: the tap catcher over the thread's own band. The
              strips cover above and below, but the band the cards
              sit in belongs to the (box-none) region — a tap in the
              slivers beside a card would otherwise fall through to
              the verses. The catcher wears the region's own animated
              geometry, sits under the cards (zIndex 15 < the
              region's 26), and closes on a tap like the strips do.
              It is a plain Pressable: a drag starting here is
              claimed by the page ScrollView as a scroll and the
              press is cancelled — a scroll never closes the thread. */}
          <ReAnimated.View style={[styles.tapCatcher, regionStyle]} pointerEvents="box-none">
            <Pressable style={StyleSheet.absoluteFill} onPress={() => requestToggle(false)} />
          </ReAnimated.View>
        </>
      ) : null}
      {/* v249: the faces' own hit target — a real Pressable over the
          closed stack, riding ABOVE the entry head (zIndex 30), so
          a tap on a face is the face's press and can never leak
          through to the verse row's expand/collapse toggle beneath
          it (his video, 2026-10-25 15:21: face taps kept flipping
          the verse row instead). It lives outside the region
          ScrollView, whose nested gesture handling made the buried
          card Pressable finicky, and it asks for OPEN by name —
          never a flip of current state. While the thread is open
          it stands down; the cards' own presses carry the close. */}
      {!open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open the notes on these verses"
          style={[styles.faceHit, { top: ANCHOR_TOP, right: 0, width: hitBox.width, height: hitBox.height }]}
          hitSlop={6}
          onPress={() => requestToggle(true)}
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
              onPressCard={() => requestToggle(false)}
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
  topPeopleIds,
}: {
  people: Person[];
  profile: ProfileIdentity;
  /** null = Me (the default). */
  value: LineAuthor | null;
  palette: BiblePalette;
  onChange: (author: LineAuthor | null) => void;
  /** v356: the Top 5 — the people most often credited on his
   * stored notes (rankedAuthorIds over the marks map), most first. */
  topPeopleIds?: string[];
}) {
  // v356 (his ruling, 2026-10-29 23:09): the roster under the note
  // box runs past a hundred chips — a search field at the top of
  // the list filters by name as he types, and at rest a Top 5 (the
  // people he actually credits) leads, with the full list below in
  // its usual order. Selection is unchanged: a tap still stores
  // { authorId, authorName } on the line, Me still clears it.
  // v357 (his ruling, 2026-10-30 08:16): the full list goes away —
  // at rest the picker is the search field, the Me chip, and the
  // Top 5, nothing more. Typing still searches the WHOLE roster
  // and shows every match; nobody is unreachable, they are just
  // no longer all standing in the room.
  const [query, setQuery] = useState('');
  const chip = (selected: boolean) => [
    styles.authorChip,
    {
      borderColor: selected ? palette.rasp : palette.line,
      backgroundColor: selected ? palette.band : palette.paper,
    },
  ];
  const meChip = (
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
  );
  const personChip = (person: Person) => {
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
  };
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const matches = searching ? people.filter((person) => person.name.toLowerCase().includes(q)) : [];
  const topPeople = searching
    ? []
    : (topPeopleIds ?? [])
        .map((id) => people.find((person) => person.id === id))
        .filter((person): person is Person => !!person)
        .slice(0, 5);
  return (
    <View style={styles.authorPicker}>
      <Text style={[styles.authorLabel, { color: palette.inkFaint }]}>Who said this?</Text>
      <TextInput
        style={[styles.authorSearch, { borderColor: palette.line, backgroundColor: palette.paper, color: palette.ink }]}
        placeholder="Search people…"
        placeholderTextColor={palette.inkFaint}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />
      {searching ? (
        <>
          <View style={styles.authorRow}>
            {meChip}
            {matches.map(personChip)}
          </View>
          {matches.length === 0 ? (
            <Text style={[styles.authorEmpty, { color: palette.inkFaint }]}>No one by that name.</Text>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.authorRow}>{meChip}</View>
          {topPeople.length ? (
            <>
              <Text style={[styles.authorLabel, { color: palette.inkFaint, marginTop: 10 }]}>Top 5</Text>
              <View style={styles.authorRow}>{topPeople.map(personChip)}</View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // v244: the blur strips sit where the 5% scrim sat (zIndex 14,
  // under the region's 26) but carry a real BlurView each.
  blurStrip: { position: 'absolute', zIndex: 14 },
  // v249: the band tap catcher — over the strips (14), under the
  // region's cards (26); its geometry is the region's animated
  // style, applied alongside this static frame.
  tapCatcher: { position: 'absolute', left: 0, right: 0, zIndex: 15 },
  // v249: the closed faces' dedicated hit target — above the entry
  // head and the region alike, exactly the stack's cascade box.
  faceHit: { position: 'absolute', zIndex: 30 },
  region: { position: 'absolute', left: 0, right: 0, zIndex: 26 },
  card: {
    position: 'absolute',
    overflow: 'hidden',
    // v249: the radius lives in the STATIC style too (16 = the open
    // resting radius the animated style lands on). Android draws the
    // elevation shadow's silhouette from the static outline — with
    // the radius only in the animated style the silhouette stayed
    // SQUARE and the open card wore grey patches at its bottom
    // corners. The animated style still owns the drawn radius frame
    // by frame (it interpolates 25.5 → 16 over this one); the static
    // value only teaches the shadow the card's true shape — the
    // same cure the seed got in v244.
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: 'rgba(50,25,35,1)',
    shadowOffset: { width: 0, height: 10 },
    // shadowRadius + elevation are driven by the bloom progress in
    // the animated style — at rest both are 0, so the closed card
    // casts nothing (the seed wears the face's shadow instead).
  },
  cardIn: { paddingTop: 13, paddingHorizontal: 15, paddingBottom: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  cardName: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
  cardKind: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1 },
  cardSpan: { fontSize: 10, fontWeight: '700', opacity: 0.6 },
  // v244: the big bubble's words are reading size, not caption size.
  cardText: { fontSize: 15, lineHeight: 22.5, fontWeight: '600' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginTop: 6 },
  cardActionBtn: { padding: 4 },
  seed: {
    position: 'absolute',
    top: 0,
    right: 0,
    // v244: the face's own shadow — round because the radius lives
    // HERE, in the static style (51 / 2), soft because it is small:
    // offset 2, radius 6, a quarter-strength ink. This is the fix
    // for the square shadow that sat on the v214 faces.
    borderRadius: FACE_SIZE / 2,
    shadowColor: 'rgba(50,25,35,1)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.25,
    elevation: 4,
  },
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
  authorSearch: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, fontSize: 13.5, marginBottom: 9 },
  authorEmpty: { fontSize: 12, marginTop: 7 },
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
