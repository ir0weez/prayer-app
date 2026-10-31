import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

/**
 * The app's one cycling word — extracted in v386 from the white
 * blocks' CyclingAddLabel (components/time-block-indicator.tsx)
 * so the claimed blocks' flight board (components/time-off-
 * travel.tsx) cycles its destination through the Time Off
 * planner's kind words with the SAME cadence and motion, from
 * one shared source.
 *
 * The behaviour is the whites' own, verbatim (his settled
 * ruling: whole words, sitting still, crossfading — no letter
 * wave, no bounce): every WORD_CYCLE_MS the word fades out with
 * a slight rise (200ms), swaps, and fades back in (240ms),
 * Easing.inOut(Easing.quad), JS Animated on the native driver.
 * Each seat starts on its own word of the loop (startIndex), so
 * neighbouring seats never say the same word at the same time.
 *
 * v389 (Oct 31) — the flight board's seats get their own
 * motions, picked by Jonathan from live mockups
 * (time-off-word-animation-v4.html — "I LOVE it! Let's do
 * it!"), as VARIANTS of this one component. The default
 * "swap" variant above is untouched — the ordinary whites
 * keep it byte-for-byte in behaviour. The variants:
 *
 * - "typewriter" — the NOW BOARDING hero's destination. The
 *   word types letter by letter, rests, erases fast, and the
 *   next word types. An underline cursor sits under the NEXT
 *   letter slot at a FIXED level, blinking — it only ever
 *   slides sideways. NO LAYOUT SHIFT, EVER (his explicit
 *   condition): every letter of the current word renders in
 *   its own slot from the first frame and is revealed/hidden
 *   by opacity only, so the word line's height and the card's
 *   size never change across type/rest/erase.
 * - "cascade" — the panel flight rows' destination. On the
 *   shared cadence the old word fades out, then the new
 *   word's letters settle in staggered (a slight rise + fade,
 *   ease-out). The row's height never changes.
 *
 * All three are JS/state-driven with timers cleaned up on
 * unmount, plain Animated timings — no libraries, no springs.
 */
export const WORD_CYCLE_MS = 2800;

/** v389 typewriter timings (the mockup's own, milliseconds). */
export const TYPEWRITER_TYPE_MS = 75;
export const TYPEWRITER_REST_MS = 1600;
export const TYPEWRITER_ERASE_MS = 35;
export const TYPEWRITER_GAP_MS = 260;
export const TYPEWRITER_START_MS = 300;
export const CURSOR_BLINK_MS = 530;

/** v389 cascade timings (the mockup's own, milliseconds). */
export const CASCADE_FADE_MS = 180;
export const CASCADE_STAGGER_MS = 45;
export const CASCADE_LETTER_MS = 180;

export type CyclingWordVariant = "swap" | "typewriter" | "cascade";

export function CyclingWord({
  words,
  startIndex = 0,
  style,
  variant = "swap",
}: {
  words: readonly string[];
  startIndex?: number;
  style?: StyleProp<TextStyle>;
  variant?: CyclingWordVariant;
}) {
  if (variant === "typewriter") return <TypewriterWord words={words} startIndex={startIndex} style={style} />;
  if (variant === "cascade") return <CascadeWord words={words} startIndex={startIndex} style={style} />;
  return <SwapWord words={words} startIndex={startIndex} style={style} />;
}

/**
 * The original rotator — the whites' whole-word crossfade,
 * verbatim from v386. The ordinary white blocks ride this
 * (through CyclingWord's default variant) and nothing about
 * it changes.
 */
function SwapWord({
  words,
  startIndex = 0,
  style,
}: {
  words: readonly string[];
  startIndex?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const anim = useRef(new Animated.Value(0)).current;

  const translateY = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [6, 0, -6] });
  const opacity = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  useEffect(() => {
    if (words.length < 2) return;
    const wordTimer = setInterval(() => {
      Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        setWordIndex((w) => (w + 1) % words.length);
        anim.setValue(-1);
        Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      });
    }, WORD_CYCLE_MS);
    return () => clearInterval(wordTimer);
  }, [anim, words]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Text style={style}>{words[wordIndex % words.length]}</Text>
    </Animated.View>
  );
}

/**
 * v389 — the typewriter (the NOW hero's destination).
 *
 * The word's full shape is RESERVED from the first frame:
 * every letter renders in its own slot (plus one trailing
 * space slot, the seat past the last letter), and typing or
 * erasing only flips a slot's opacity — nothing reflows, the
 * line's height and the card's size never change. The
 * underline cursor is a short rounded bar seated under the
 * NEXT slot: its `left` comes from that slot's own measured
 * layout, its level (bottom, height) is fixed by the font
 * size alone, and it blinks on CURSOR_BLINK_MS. It only ever
 * slides sideways.
 *
 * The machine is a chained-timeout loop over local counters
 * (type → rest → erase → gap → next word), mirrored into
 * state for the render, with the pending timeout cleared on
 * unmount.
 */
function TypewriterWord({
  words,
  startIndex = 0,
  style,
}: {
  words: readonly string[];
  startIndex?: number;
  style?: StyleProp<TextStyle>;
}) {
  const cycling = words.length > 1;
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : 16;
  const [wordIndex, setWordIndex] = useState(startIndex);
  const [shown, setShown] = useState(cycling ? 0 : (words[startIndex % words.length]?.length ?? 0));
  const [cursorOn, setCursorOn] = useState(true);
  const [, setLayoutTick] = useState(0);
  const layoutRef = useRef<{ x: number; width: number }[]>([]);

  useEffect(() => {
    if (!cycling) return;
    let timer: ReturnType<typeof setTimeout>;
    let w = startIndex % words.length;
    let s = 0;
    const typeStep = () => {
      s += 1;
      setShown(s);
      timer = setTimeout(s >= words[w].length ? eraseStep : typeStep, s >= words[w].length ? TYPEWRITER_REST_MS : TYPEWRITER_TYPE_MS);
    };
    const eraseStep = () => {
      s -= 1;
      setShown(s);
      timer = setTimeout(s <= 0 ? nextWord : eraseStep, TYPEWRITER_ERASE_MS);
    };
    const nextWord = () => {
      timer = setTimeout(() => {
        w = (w + 1) % words.length;
        s = 0;
        setWordIndex(w);
        setShown(0);
        timer = setTimeout(typeStep, TYPEWRITER_TYPE_MS);
      }, TYPEWRITER_GAP_MS);
    };
    timer = setTimeout(typeStep, TYPEWRITER_START_MS);
    return () => clearTimeout(timer);
  }, [cycling, startIndex, words]);

  useEffect(() => {
    if (!cycling) return;
    const blink = setInterval(() => setCursorOn((on) => !on), CURSOR_BLINK_MS);
    return () => clearInterval(blink);
  }, [cycling]);

  const recordLayout = (slot: number, x: number, width: number) => {
    const prev = layoutRef.current[slot];
    if (!prev || Math.abs(prev.x - x) > 0.5 || Math.abs(prev.width - width) > 0.5) {
      layoutRef.current[slot] = { x, width };
      setLayoutTick((t) => t + 1);
    }
  };

  const word = words[wordIndex % words.length];
  const letters = word.split("");
  // The cursor's seat: the measured slot it stands under. Slot
  // 0 sits at the row's own start, so before the first layout
  // lands the fallback (left 0, the minimum width) is already
  // the exact seat for the first letter — the cursor is on
  // screen from the first frame, as in the mockup.
  const cursorSlot = layoutRef.current[Math.min(shown, letters.length)];
  const cursorHeight = Math.max(3, Math.round(fontSize * 0.12));

  return (
    <View style={{ flexDirection: "row", position: "relative", alignSelf: "flex-start" }} accessibilityLabel={word}>
      {letters.map((ch, i) => (
        <Text
          key={`${wordIndex}-${i}`}
          style={[style, { opacity: i < shown ? 1 : 0 }]}
          onLayout={(e) => recordLayout(i, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
        >
          {ch}
        </Text>
      ))}
      {/* The trailing slot: the seat past the last letter,
          where the cursor rests while the word stands whole.
          Invisible — it reserves the cursor's end position. */}
      <Text
        style={[style, { opacity: 0 }]}
        onLayout={(e) => recordLayout(letters.length, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      >
        {" "}
      </Text>
      {cycling ? (
        <View
          style={{
            position: "absolute",
            left: cursorSlot?.x ?? 0,
            bottom: 1,
            width: Math.max(Math.round(fontSize * 0.36), (cursorSlot?.width ?? 0) - 2),
            height: cursorHeight,
            borderRadius: cursorHeight / 2,
            backgroundColor: flat.color,
            opacity: cursorOn ? 1 : 0,
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * v389 — the cascade (the panel rows' destination). The word
 * rides the shared WORD_CYCLE_MS cadence with its seat's own
 * startIndex phase, as the swap always has: at each turn the
 * standing word fades out whole (CASCADE_FADE_MS, ease-in),
 * then the next word's letters settle in one by one —
 * CASCADE_STAGGER_MS apart, each a slight rise + fade over
 * CASCADE_LETTER_MS, Easing.out(Easing.quad) on the native
 * driver. Letters render in their slots throughout, so the
 * row's height never changes. First mount stands whole; the
 * cascade belongs to the change.
 */
function CascadeWord({
  words,
  startIndex = 0,
  style,
}: {
  words: readonly string[];
  startIndex?: number;
  style?: StyleProp<TextStyle>;
}) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = typeof flat.fontSize === "number" ? flat.fontSize : 16;
  const rise = Math.max(3, Math.round(fontSize * 0.45));
  const fade = useRef(new Animated.Value(1)).current;
  const letterAnims = useRef<Animated.Value[]>([]).current;
  const maxLen = Math.max(1, ...words.map((w) => w.length));
  while (letterAnims.length < maxLen) letterAnims.push(new Animated.Value(1));

  useEffect(() => {
    if (words.length < 2) return;
    let stopped = false;
    let current: Animated.CompositeAnimation | null = null;
    let index = startIndex % words.length;
    const wordTimer = setInterval(() => {
      current = Animated.timing(fade, { toValue: 0, duration: CASCADE_FADE_MS, easing: Easing.in(Easing.quad), useNativeDriver: true });
      current.start(({ finished }) => {
        if (!finished || stopped) return;
        index = (index + 1) % words.length;
        const next = words[index];
        for (let i = 0; i < next.length; i++) letterAnims[i].setValue(0);
        fade.setValue(1);
        setWordIndex(index);
        current = Animated.stagger(
          CASCADE_STAGGER_MS,
          next.split("").map((_, i) =>
            Animated.timing(letterAnims[i], { toValue: 1, duration: CASCADE_LETTER_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ),
        );
        current.start();
      });
    }, WORD_CYCLE_MS);
    return () => {
      stopped = true;
      clearInterval(wordTimer);
      current?.stop();
    };
  }, [fade, letterAnims, startIndex, words]);

  const word = words[wordIndex % words.length];
  return (
    <Animated.View style={{ flexDirection: "row", opacity: fade }} accessibilityLabel={word}>
      {word.split("").map((ch, i) => {
        const v = letterAnims[i];
        return (
          <Animated.Text
            key={i}
            style={[
              style,
              {
                opacity: v,
                transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) }],
              },
            ]}
          >
            {ch}
          </Animated.Text>
        );
      })}
    </Animated.View>
  );
}
