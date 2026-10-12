import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
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
          <CyclingAddLabel mutedColor={colors.muted} />
          <Text style={[styles.time, { color: colors.muted }]}>
            {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const ADD_WORDS = ["event", "todo", "ministry"];
const WORD_COLORS = ["#FF6B6B", "#FFA94D", "#FFD43B", "#69DB7C", "#4DABF7", "#9775FA", "#F783AC"];
const WORD_CYCLE_MS = 2800;
const COLOR_STEP_MS = 450;

/** One keyword ("event" / "todo" / "ministry") with colorful animated letters. */
function RainbowWord({ word, offset }: { word: string; offset: number }) {
  return (
    <Text>
      {word.split("").map((ch, i) => (
        <Text key={i} style={{ color: WORD_COLORS[(i + offset) % WORD_COLORS.length], fontWeight: "800" }}>
          {ch}
        </Text>
      ))}
    </Text>
  );
}

/**
 * "add <event|todo|ministry>?" — the keyword cycles every few seconds with a
 * soft fade, and its letters flow through bright colors. Restrained: no
 * bounce, no movement, just color and fades.
 */
function CyclingAddLabel({ mutedColor }: { mutedColor: string }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [colorOffset, setColorOffset] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const wordTimer = setInterval(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setWordIndex((w) => (w + 1) % ADD_WORDS.length);
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      });
    }, WORD_CYCLE_MS);
    const colorTimer = setInterval(() => setColorOffset((o) => o + 1), COLOR_STEP_MS);
    return () => {
      clearInterval(wordTimer);
      clearInterval(colorTimer);
    };
  }, [fadeAnim]);

  return (
    <View style={styles.left}>
      <MaterialIcons name="add" size={18} color={mutedColor} />
      <Text style={[styles.label, { color: mutedColor }]}>add </Text>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text style={styles.label}>
          <RainbowWord word={ADD_WORDS[wordIndex]} offset={colorOffset} />
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
