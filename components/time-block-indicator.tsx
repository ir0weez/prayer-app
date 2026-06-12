import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock, timeToMinutes } from "@/lib/time-blocks";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
}

/**
 * Compact time block indicator for inline display in schedule
 * Shows available time between scheduled items with fixed time-based colors
 */
export function TimeBlockIndicator({ block }: TimeBlockIndicatorProps) {
  const colors = useColors();

  // Get color based on start time
  const getColorForTimeBlock = (startTime: string) => {
    const startMinutes = timeToMinutes(startTime);
    const sixAM = 6 * 60; // 360
    const nineAM = 9 * 60; // 540
    const onePM = 13 * 60; // 780
    const sevenPM = 19 * 60; // 1140
    const tenPM = 22 * 60; // 1320

    if (startMinutes < nineAM) {
      // 6am-9am: light green/teal
      return { bg: "#D1FAE5", border: "#10B981", text: "#047857" };
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

  const colorScheme = getColorForTimeBlock(block.startTime);

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
          {block.startTime}
        </Text>
        <Text style={[styles.arrow, { color: colorScheme.text }]}>→</Text>
        <Text style={[styles.time, { color: colorScheme.text }]}>
          {block.endTime}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: colorScheme.border }]}>
        <Text style={styles.badgeText}>{block.label}</Text>
      </View>
    </View>
  );
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
