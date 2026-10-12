import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock, timeToMinutes } from "@/lib/time-blocks";
import { format12HourTime } from "@/lib/utils";
import { NowPill } from "./now-indicator";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
  nowMinutes?: number | null;
  onPress?: (block: TimeBlock) => void;
}

interface TimeBlockGroupProps {
  blocks: TimeBlock[];
  nowMinutes?: number | null;
  onPress?: (block: TimeBlock) => void;
}

/** True when "now" falls inside this white block's hour. */
function blockContainsNow(block: TimeBlock, nowMinutes?: number | null): boolean {
  return (
    nowMinutes != null &&
    timeToMinutes(block.startTime) <= nowMinutes &&
    nowMinutes < timeToMinutes(block.endTime)
  );
}

/**
 * White-space block: a skinny, tappable empty slot for one hour of unscheduled
 * time. Tapping opens the event creator pre-filled with the block's start time.
 * Shows fixed hours (no live countdown); the parent removes blocks once their
 * hour has passed.
 */
export function TimeBlockIndicator({ block, nowMinutes, onPress }: TimeBlockIndicatorProps) {
  const colors = useColors();
  const isNow = blockContainsNow(block, nowMinutes);

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {isNow && <NowPill />}
        <Text style={[styles.time, { color: colors.muted }]}>
          {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * A run of hour-adjacent white blocks rendered as ONE touching box, with a
 * separate tappable row per hour divided by hairlines. Each row still opens
 * the event creator pre-filled with its own hour.
 */
export function TimeBlockGroup({ blocks, nowMinutes, onPress }: TimeBlockGroupProps) {
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {blockContainsNow(block, nowMinutes) && <NowPill />}
            <Text style={[styles.time, { color: colors.muted }]}>
              {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const ADD_WORDS = ["event", "todo", "ministry", "rest"];
const WORD_CYCLE_MS = 2800;

/** One letter gently floating up and down (sine, no bounce). */
function WavyLetter({ ch, index, color }: { ch: string; index: number; color: string }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, { toValue: -3, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    // Stagger the start so the letters ripple; identical loop lengths keep
    // the wave in phase forever.
    const startTimeout = setTimeout(() => loop.start(), index * 130);
    return () => {
      clearTimeout(startTimeout);
      loop.stop();
    };
  }, [index, translateY]);

  return (
    <Animated.Text style={{ transform: [{ translateY }], color, fontWeight: "800" }}>
      {ch}
    </Animated.Text>
  );
}

/** The keyword with each letter floating in a gentle wave. */
function WavyWord({ word, color }: { word: string; color: string }) {
  return (
    <Text>
      {word.split("").map((ch, i) => (
        <WavyLetter key={`${word}-${i}`} ch={ch} index={i} color={color} />
      ))}
    </Text>
  );
}

/**
 * "add <event|todo|ministry|rest>?" — each row starts on a different word of
 * the loop and they all cycle together, so neighboring rows always say
 * something different. The switch is a soft fade with a slight rise — calm,
 * no bounce. Letters keep their gentle float throughout.
 */
function CyclingAddLabel({ startIndex, mutedColor, accentColor }: { startIndex: number; mutedColor: string; accentColor: string }) {
  const [wordIndex, setWordIndex] = useState(startIndex);
  const anim = useRef(new Animated.Value(0)).current;

  const translateY = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [6, 0, -6] });
  const opacity = anim.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  useEffect(() => {
    const wordTimer = setInterval(() => {
      Animated.timing(anim, { toValue: 1, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(() => {
        setWordIndex((w) => (w + 1) % ADD_WORDS.length);
        anim.setValue(-1);
        Animated.timing(anim, { toValue: 0, duration: 240, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
      });
    }, WORD_CYCLE_MS);
    return () => clearInterval(wordTimer);
  }, [anim]);

  return (
    <View style={styles.left}>
      <MaterialIcons name="add" size={18} color={mutedColor} />
      <Text style={[styles.label, { color: mutedColor }]}>add </Text>
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <Text style={styles.label}>
          <WavyWord word={ADD_WORDS[wordIndex % ADD_WORDS.length]} color={accentColor} />
        </Text>
      </Animated.View>
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
