import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock, timeToMinutes } from "@/lib/time-blocks";
import { format12HourTime } from "@/lib/utils";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
}

/**
 * Compact time block indicator for inline display in schedule
 * Shows available time between scheduled items with fixed time-based colors
 * Dynamically updates to show countdown as time passes
 */
export function TimeBlockIndicator({ block }: TimeBlockIndicatorProps) {
  const colors = useColors();
  const [displayBlock, setDisplayBlock] = useState<TimeBlock | null>(block);
  const [remainingTime, setRemainingTime] = useState<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 });

  // Update block display and remaining hours every minute
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
        const newStartHours = currentHours;
        const newStartTime = `${String(newStartHours).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;
        setDisplayBlock({ ...block, startTime: newStartTime });

        // Calculate remaining time (actual, not rounded up)
        const remainingMinutes = endMinutes - currentTimeInMinutes;
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        setRemainingTime({ hours, minutes: mins });
      } else {
        setDisplayBlock(block);
        const totalMinutes = endMinutes - startMinutes;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        setRemainingTime({ hours, minutes: mins });
      }
    };

    updateBlock();
    const interval = setInterval(updateBlock, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [block]);

  // Get color based on start time
  const getColorForTimeBlock = (startTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const sixAM = 6 * 60; // 360
    const nineAM = 9 * 60; // 540
    const onePM = 13 * 60; // 780
    const sevenPM = 19 * 60; // 1140
    const tenPM = 22 * 60; // 1320

    if (startMinutes < nineAM) {
      // 6am-9am: black/dark gray
      return { bg: "#F3F4F6", border: "#1F2937", text: "#111827" };
    } else if (startMinutes < onePM) {
      // 9am-1pm: purple
      return { bg: "#EDE9FE", border: "#A855F7", text: "#6D28D9" };
    } else if (startMinutes < sevenPM) {
      // 1pm-7pm: orange
      return { bg: "#FEF3C7", border: "#F59E0B", text: "#D97706" };
    } else if (startMinutes < tenPM) {
      // 7pm-10pm: purple
      return { bg: "#EDE9FE", border: "#A855F7", text: "#6D28D9" };
    } else {
      // 10pm-11:59pm: black/dark gray
      return { bg: "#F3F4F6", border: "#1F2937", text: "#111827" };
    }
  };

  // Don't render if block has passed
  if (!displayBlock) {
    return null;
  }

  const colorScheme = getColorForTimeBlock(displayBlock!.startTime);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme.bg,
          borderLeftColor: colorScheme.border,
        },
      ]}
    >
      <View style={styles.timeRange}>
        <MaterialIcons name="schedule" size={14} color={colorScheme.text} />
        <Text style={[styles.time, { color: colorScheme.text }]}>
          {format12HourTime(displayBlock!.startTime)}
        </Text>
        <Text style={[styles.arrow, { color: colorScheme.text }]}>→</Text>
        <Text style={[styles.time, { color: colorScheme.text }]}>
          {format12HourTime(displayBlock!.endTime)}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: colorScheme.border }]}>
        <Text style={styles.badgeText}>
          {displayBlock!.label}
        </Text>
      </View>
    </View>
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
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  time: {
    fontSize: 13,
    fontWeight: "600",
  },
  arrow: {
    fontSize: 12,
    fontWeight: "500",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
});
