import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock } from "@/lib/time-blocks";
import { format12HourTime } from "@/lib/utils";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
  onPress?: (block: TimeBlock) => void;
}

interface TimeBlockGroupProps {
  blocks: TimeBlock[];
  onPress?: (block: TimeBlock) => void;
}

/**
 * White-space block: a skinny, tappable empty slot for one hour of unscheduled
 * time. Tapping opens the event creator pre-filled with the block's start time.
 * Shows fixed hours (no live countdown); the parent removes blocks once their
 * hour has passed.
 */
export function TimeBlockIndicator({ block, onPress }: TimeBlockIndicatorProps) {
  const colors = useColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`White space from ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to add an event.`}
      onPress={() => onPress?.(block)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.65 : 1,
        },
      ]}
    >
      <View style={styles.left}>
        <MaterialIcons name="add" size={18} color={colors.muted} />
        <Text style={[styles.label, { color: colors.muted }]}>Add event?</Text>
      </View>
      <Text style={[styles.time, { color: colors.muted }]}>
        {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
      </Text>
    </Pressable>
  );
}

/**
 * A run of hour-adjacent white blocks rendered as ONE touching box, with a
 * separate tappable row per hour divided by hairlines. Each row still opens
 * the event creator pre-filled with its own hour.
 */
export function TimeBlockGroup({ blocks, onPress }: TimeBlockGroupProps) {
  const colors = useColors();
  if (blocks.length === 0) return null;

  return (
    <View
      accessibilityRole="button"
      style={[
        styles.groupContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {blocks.map((block, index) => (
        <Pressable
          key={block.id}
          accessibilityRole="button"
          accessibilityLabel={`White space from ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to choose what to add.`}
          onPress={() => onPress?.(block)}
          style={({ pressed }) => [
            styles.groupRow,
            index > 0 && {
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            },
            { opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <CyclingAddLabel startIndex={index} mutedColor={colors.muted} accentColor={colors.primary} />
          <Text style={[styles.time, { color: colors.muted }]}>
            {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const ADD_WORDS = ["event", "todo", "ministry", "rest"];
const WORD_CYCLE_MS = 2800;
const LETTER_STAGGER_MS = 30;
const EXIT_MS = 180;
const ENTER_MS = 220;
const MAX_WORD_LEN = Math.max(...ADD_WORDS.map((w) => w.length));

type WordPhase = "idle" | "exiting" | "entering";

/**
 * One letter of the cycling keyword. Floats gently on its own (sine wave, no
 * bounce) and, when the word changes, cascades out with its siblings and then
 * cascades back in spelling the new word.
 */
function TransLetter({ ch, index, color, phase }: { ch: string; index: number; color: string; phase: WordPhase }) {
  const waveY = useRef(new Animated.Value(0)).current;
  const transY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  // Gentle idle float — independent of the word-change transition.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveY, { toValue: -3, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(waveY, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    // Stagger the start so the letters ripple; identical loop lengths keep
    // the wave in phase forever.
    const startTimeout = setTimeout(() => loop.start(), index * 130);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [index, waveY]);

  // Word-change transition. Layout effect so newly mounted letters (when the
  // new word is longer) start below/invisible before paint — no flash.
  useLayoutEffect(() => {
    const delay = index * LETTER_STAGGER_MS;
    if (phase === "exiting") {
      Animated.parallel([
        Animated.timing(transY, { toValue: -14, duration: EXIT_MS, delay, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: EXIT_MS, delay, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else if (phase === "entering") {
      transY.setValue(14);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(transY, { toValue: 0, duration: ENTER_MS, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: ENTER_MS, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      transY.setValue(0);
      opacity.setValue(1);
    }
  }, [phase, index, transY, opacity]);

  return (
    <Animated.Text style={{ transform: [{ translateY: waveY }, { translateY: transY }], opacity, color, fontWeight: "800" }}>
      {ch}
    </Animated.Text>
  );
}

/**
 * "add <event|todo|ministry|rest>?" — each row starts on a different word of
 * the loop and they all cycle together, so neighboring rows always say
 * something different. On each switch the old word's letters cascade up and
 * out, then the new word's letters cascade up into place. Letters keep their
 * gentle float throughout (no bounce anywhere).
 */
function CyclingAddLabel({ startIndex, mutedColor, accentColor }: { startIndex: number; mutedColor: string; accentColor: string }) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const [phase, setPhase] = useState<WordPhase>("idle");
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const wordTimer = setInterval(() => {
      if (phaseRef.current !== "idle") return;
      setPhase("exiting");
      const exitTotal = EXIT_MS + (MAX_WORD_LEN - 1) * LETTER_STAGGER_MS + 60;
      timeoutsRef.current.push(setTimeout(() => {
        setWordIndex((w) => (w + 1) % ADD_WORDS.length);
        setPhase("entering");
        const enterTotal = ENTER_MS + (MAX_WORD_LEN - 1) * LETTER_STAGGER_MS + 60;
        timeoutsRef.current.push(setTimeout(() => setPhase("idle"), enterTotal));
      }, exitTotal));
    }, WORD_CYCLE_MS);
    return () => {
      clearInterval(wordTimer);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, []);

  const word = ADD_WORDS[wordIndex % ADD_WORDS.length];

  return (
    <View style={styles.left}>
      <MaterialIcons name="add" size={18} color={mutedColor} />
      <Text style={[styles.label, { color: mutedColor }]}>add </Text>
      <View style={{ height: 22, overflow: "hidden", justifyContent: "center" }}>
        <Text style={styles.label}>
          {word.split("").map((ch, i) => (
            <TransLetter key={i} ch={ch} index={i} color={accentColor} phase={phase} />
          ))}
        </Text>
      </View>
      <Text style={[styles.label, { color: mutedColor }]}>?</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    fontWeight: "500",
  },
  groupContainer: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: "hidden",
  },
  groupRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
