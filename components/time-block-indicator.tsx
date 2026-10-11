import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock, timeToMinutes } from "@/lib/time-blocks";
import { format12HourTime } from "@/lib/utils";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
  onPress?: (block: TimeBlock) => void;
}

/**
 * White-space block: a skinny, tappable empty slot showing unscheduled time.
 * Tapping opens the event creator pre-filled with the block's start time.
 * Dynamically updates to show remaining time as time passes.
 */
export function TimeBlockIndicator({ block, onPress }: TimeBlockIndicatorProps) {
  const colors = useColors();
  const [displayBlock, setDisplayBlock] = useState<TimeBlock | null>(block);

  // Update block display every minute
  useEffect(() => {
    const updateBlock = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTimeInMinutes = currentHours * 60 + currentMinutes;

      const startMinutes = timeToMinutes(block.startTime);
      const endMinutes = timeToMinutes(block.endTime);

      // If current time is past the end time, don't show the block
      if (currentTimeInMinutes >= endMinutes) {
        setDisplayBlock(null);
        return;
      }

      // If current time is within the block, update start time to current time
      if (currentTimeInMinutes >= startMinutes) {
        const newStartTime = `${String(currentHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;
        const remainingMinutes = endMinutes - currentTimeInMinutes;
        setDisplayBlock({ ...block, startTime: newStartTime, durationMinutes: remainingMinutes, label: formatTimeRemaining(Math.floor(remainingMinutes / 60), remainingMinutes % 60) });
      } else {
        setDisplayBlock(block);
      }
    };

    updateBlock();
    const interval = setInterval(updateBlock, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [block]);

  // Don't render if block has passed
  if (!displayBlock) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`White space from ${format12HourTime(displayBlock.startTime)} to ${format12HourTime(displayBlock.endTime)}. Tap to add an event.`}
      onPress={() => onPress?.(displayBlock)}
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
        {format12HourTime(displayBlock.startTime)} → {format12HourTime(displayBlock.endTime)}
      </Text>
    </Pressable>
  );
}

// Helper function to format time remaining
function formatTimeRemaining(hours: number, minutes: number): string {
  if (hours === 0) {
    return minutes === 0 ? "<1m" : `${minutes}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 4,
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
});
