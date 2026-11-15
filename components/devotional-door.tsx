// ─── v535 — the chapter page's Devotional door, with the pill
// morph (chapter-delete-devotional-v3.html, "The pill becomes
// the question" — his pick, 2026-11-15) ────────────────────────
//
// The doorway pill row carries Stories / Devotional / Contents.
// When this chapter's devotional is ON THE PHONE (disk truth per
// lib/devotional-download.ts — the file present at its exact
// hosted size, status 'ready'), press-and-hold the Devotional
// pill and the pill ANIMATES in its own seat — a Material
// container transform, ~250ms on the app's emphasized curve —
// stretching horizontally into a two-segment control: a filled
// error-red segment (trash icon + "Remove") and a tonal "Keep"
// segment, at the pill's own height, in the same row. Nothing
// floats: no overlay, no popover, no sheet.
//
//  - Remove deletes the LOCAL file only (the hosted library
//    copy is untouched; re-download stays possible — the
//    Downloads page's rule, through the same
//    deleteDevotionalDownload). If the live player session is
//    THIS chapter's devotional, the session stops first.
//    The control folds back (the same motion, reversed) to the
//    normal pill, which then shows its not-downloaded state —
//    the file-download glyph (the door's v527 dress).
//  - Keep, or a tap anywhere else on the page, folds it back
//    unchanged. The page owns that signal: it raises foldSignal
//    on any touch that did not begin on this door (the door
//    stamps its own touches through touchStampRef, so its
//    segments never trip the page's handler).
//  - When the devotional is not on the phone, the long-press
//    does nothing at all.
//  - Reduce motion: no stretch — the faces swap instantly.
//
// The stretch is literal: the seat itself carries an animated
// width from its measured rest width (its flex third of the
// doorway) to the segments' measured natural width (a hidden
// sizer twin of the segments), and the segments flex WITH the
// seat as it travels. Stories and Contents keep their seats —
// they give room through the row's flex, nothing is covered.
// Colours are roles, never pinned: Remove wears the palette's
// error role (the theme's own destructive red, per scheme),
// Keep the palette's tonal paper surface, and the pill's normal
// dress is the doorway's own (primCont + btnDress) — unchanged.

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import type { BiblePalette } from './bible-v205/palette';
import { useReduceMotionEnabled } from './bible-v205/books-filter-bar';
import { devotionalKey, type Devotional } from '@/lib/devotionals';
import {
  deleteDevotionalDownload,
  useDevotionalDownloadState,
} from '@/lib/devotional-download';
import { EMPHASIZED_EASING } from '@/lib/bible-v205/books-filter';

/** The morph's one motion: ~250ms, the drawing's quarter second. */
export const DEVOTIONAL_MORPH_MS = 250;

/** The emphasized curve, built lazily inside handlers — never at
 *  module level or during render, so server-render test
 *  harnesses never have to evaluate it (the filter bar's rule). */
function emphasized() {
  return Easing.bezier(
    EMPHASIZED_EASING[0],
    EMPHASIZED_EASING[1],
    EMPHASIZED_EASING[2],
    EMPHASIZED_EASING[3],
  );
}

export function DevotionalDoor({
  devotional,
  palette,
  onListen,
  foldSignal,
  onMorphChange,
  touchStampRef,
}: {
  devotional: Devotional;
  palette: BiblePalette;
  /** The pill's tap: open the devotional (the page's listen door). */
  onListen: () => void;
  /** Bumped by the page when a touch lands anywhere else while
   *  the door stands morphed — the fold-back signal. */
  foldSignal: number;
  /** Reports the morph standing/folded, so the page knows when
   *  an outside touch should fold. */
  onMorphChange: (morphed: boolean) => void;
  /** The page's fold guard: the door stamps the timestamp of
   *  every touch that begins on it; the page folds only for a
   *  touch whose timestamp differs. */
  touchStampRef: RefObject<number>;
}) {
  const pal = palette;
  const download = useDevotionalDownloadState(devotional);
  const ready = download.status === 'ready';
  const reduceMotion = useReduceMotionEnabled();

  const [face, setFace] = useState<'pill' | 'segments'>('pill');
  const seatW = useSharedValue(0);
  /** The seat's flex-third width, measured while the pill stands. */
  const restWRef = useRef(0);
  /** The segments' natural width, measured by the hidden sizer. */
  const segWRef = useRef(0);
  const morphedRef = useRef(false);
  const foldingRef = useRef(false);
  const foldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMorphChangeRef = useRef(onMorphChange);
  onMorphChangeRef.current = onMorphChange;
  const reportMorph = (morphed: boolean) => {
    if (morphedRef.current === morphed) return;
    morphedRef.current = morphed;
    onMorphChangeRef.current(morphed);
  };

  const clearFoldTimer = () => {
    if (foldTimerRef.current != null) {
      clearTimeout(foldTimerRef.current);
      foldTimerRef.current = null;
    }
  };

  /** Fold back to the pill: the stretch reversed over the same
   *  250ms, the face swapping as the seat lands home. Under
   *  reduce motion the swap is instant. */
  const fold = () => {
    if (!morphedRef.current || foldingRef.current) return;
    foldingRef.current = true;
    const home = restWRef.current;
    if (reduceMotion || !(home > 0)) {
      if (home > 0) seatW.value = home;
      foldingRef.current = false;
      setFace('pill');
      reportMorph(false);
      return;
    }
    seatW.value = withTiming(home, { duration: DEVOTIONAL_MORPH_MS, easing: emphasized() });
    foldTimerRef.current = setTimeout(() => {
      foldTimerRef.current = null;
      foldingRef.current = false;
      setFace('pill');
      reportMorph(false);
    }, DEVOTIONAL_MORPH_MS);
  };
  const foldRef = useRef(fold);
  foldRef.current = fold;

  /** The long-press: the pill becomes the question. Only ever
   *  from the on-phone state — off the phone it does nothing. */
  const morphIn = () => {
    if (!ready || morphedRef.current) return;
    clearFoldTimer();
    foldingRef.current = false;
    const from = restWRef.current;
    const to = segWRef.current;
    setFace('segments');
    reportMorph(true);
    if (reduceMotion || !(from > 0) || !(to > 0)) {
      // Reduce motion (or an unmeasured seat): the segments are
      // simply there, at their natural width when it is known,
      // else at the seat's rest width.
      seatW.value = Math.max(to, from);
      return;
    }
    seatW.value = from;
    seatW.value = withTiming(to, { duration: DEVOTIONAL_MORPH_MS, easing: emphasized() });
  };

  /** Remove: stop this chapter's own live session first (if it
   *  is the one playing), fold, and delete the local file only.
   *  The player controller is required lazily here — the
   *  Ten Stops card's pattern — so the chapter page's module
   *  tree never loads the audio runtime at import time. */
  const handleRemove = () => {
    const { getDevotionalPlayerSnapshot, stopDevotional } =
      require('../lib/devotional-player') as typeof import('@/lib/devotional-player');
    const session = getDevotionalPlayerSnapshot();
    if (
      session.devotional &&
      devotionalKey(session.devotional.book, session.devotional.chapter) ===
        devotionalKey(devotional.book, devotional.chapter)
    ) {
      stopDevotional();
    }
    foldRef.current();
    void deleteDevotionalDownload(devotional);
  };

  // A touch anywhere else on the page: the page bumps the
  // signal, and a standing morph folds back unchanged.
  const signalRef = useRef(foldSignal);
  useEffect(() => {
    if (signalRef.current === foldSignal) return;
    signalRef.current = foldSignal;
    foldRef.current();
  }, [foldSignal]);

  // The file left the phone by another door (the Downloads
  // page) while the question stood open: fold at once — there
  // is nothing left to remove. A fold already running (our own
  // Remove) is left to finish on its own clock.
  useEffect(() => {
    if (face === 'segments' && !ready && !foldingRef.current) {
      clearFoldTimer();
      setFace('pill');
      reportMorph(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, ready]);

  // A new chapter's door starts as a plain pill, whatever the
  // last chapter left standing.
  const doorKey = devotionalKey(devotional.book, devotional.chapter);
  const doorKeyRef = useRef(doorKey);
  useEffect(() => {
    if (doorKeyRef.current === doorKey) return;
    doorKeyRef.current = doorKey;
    clearFoldTimer();
    foldingRef.current = false;
    setFace('pill');
    reportMorph(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doorKey]);

  useEffect(() => clearFoldTimer, []);

  const seatAnimStyle = useAnimatedStyle(() => ({ width: seatW.value }));

  const onSeatLayout = (e: LayoutChangeEvent) => {
    if (face === 'pill') restWRef.current = e.nativeEvent.layout.width;
  };
  const onSizerLayout = (e: LayoutChangeEvent) => {
    segWRef.current = e.nativeEvent.layout.width;
  };
  const stampTouch = (e: GestureResponderEvent) => {
    touchStampRef.current = e.nativeEvent.timestamp;
  };

  /** The two segments, drawn once for the standing control and
   *  once for the hidden sizer (natural widths, no flex). */
  const segments = (natural: boolean) => (
    <>
      <Pressable
        accessibilityLabel={
          natural ? undefined : `Remove the ${devotional.title} download from this phone`
        }
        onPress={natural ? undefined : handleRemove}
        style={[
          styles.seg,
          natural ? styles.segNatural : styles.segRemove,
          { backgroundColor: pal.error },
        ]}
      >
        <MaterialIcons name="delete-outline" size={15} color="#FFFFFF" />
        <Text style={[styles.segText, { color: '#FFFFFF' }]} numberOfLines={1}>
          Remove
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={natural ? undefined : 'Keep the download'}
        onPress={natural ? undefined : () => foldRef.current()}
        style={[
          styles.seg,
          natural ? styles.segNatural : styles.segKeep,
          { backgroundColor: pal.paper2 },
        ]}
      >
        <Text style={[styles.segText, { color: pal.ink }]} numberOfLines={1}>
          Keep
        </Text>
      </Pressable>
    </>
  );

  return (
    <Animated.View
      onLayout={onSeatLayout}
      onTouchStart={stampTouch}
      style={[
        styles.seat,
        face === 'pill' ? styles.seatFlex : seatAnimStyle,
        face === 'segments' ? pal.btnDress : null,
      ]}
    >
      {face === 'pill' ? (
        <Pressable
          accessibilityLabel={`Devotional — ${devotional.title}`}
          onPress={onListen}
          onLongPress={morphIn}
          style={[styles.doorBtn, { backgroundColor: pal.primCont }, pal.btnDress]}
        >
          <MaterialIcons
            name={ready ? 'play-arrow' : 'file-download'}
            size={18}
            color={pal.raspDeep}
          />
          <Text style={[styles.doorBtnText, { color: pal.raspDeep }]} numberOfLines={1}>Devotional</Text>
        </Pressable>
      ) : (
        <View style={styles.segRow}>{segments(false)}</View>
      )}
      {ready ? (
        <View pointerEvents="none" style={styles.sizer} onLayout={onSizerLayout}>
          {segments(true)}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  /** The doorway's flex child: a third of the row while the pill
   *  stands; the animated width takes over while morphed. */
  seat: {},
  seatFlex: { flex: 1 },
  /** The doorway pill's own measures (the chapter page's doorBtn,
   *  carried with the door now that the door is its own part). */
  doorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  doorBtnText: { fontSize: 13.5, fontWeight: '600' },
  segRow: { flex: 1, flexDirection: 'row', width: '100%' },
  /** One segment: the pill's own height by the same padding and
   *  type, its outer corners fully round so the pair reads as
   *  one stretched pill — no clipping, so the seat's dress (its
   *  soft shadow) survives whole. */
  seg: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  segRemove: {
    flex: 1.7,
    borderTopLeftRadius: 999,
    borderBottomLeftRadius: 999,
  },
  segKeep: {
    flex: 1,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  segNatural: {},
  segText: { fontSize: 13.5, fontWeight: '600' },
  /** The segments' hidden twin: measures their natural width so
   *  the stretch has a true landing width. Never seen, never
   *  touched. */
  sizer: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
    opacity: 0,
  },
});
