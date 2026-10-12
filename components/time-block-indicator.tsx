import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
          accessibilityLabel={`White space from ${format12HourTime(block.startTime)} to ${format12HourTime(block.endTime)}. Tap to add an event.`}
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
          <View style={styles.left}>
            <MaterialIcons name="add" size={18} color={colors.muted} />
            <Text style={[styles.label, { color: colors.muted }]}>Add event?</Text>
          </View>
          <Text style={[styles.time, { color: colors.muted }]}>
            {format12HourTime(block.startTime)} → {format12HourTime(block.endTime)}
          </Text>
        </Pressable>
      ))}
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
