import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock, timeToMinutes } from "@/lib/time-blocks";

interface TimeBlockIndicatorProps {
  block: TimeBlock;
  customColor?: string; // User-selected color (hex)
}

/**
 * Compact time block indicator for inline display in schedule
 * Shows available time between scheduled items
 */
export function TimeBlockIndicator({ block, customColor }: TimeBlockIndicatorProps) {
  const colors = useColors();
  const [remainingTime, setRemainingTime] = useState(block.label);

  // Update remaining time every minute
  useEffect(() => {
    const updateRemainingTime = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const endMinutes = timeToMinutes(block.endTime);
      const remaining = Math.max(0, endMinutes - currentMinutes);
      
      if (remaining > 0) {
        const hours = Math.floor(remaining / 60);
        const mins = remaining % 60;
        if (hours > 0) {
          setRemainingTime(`${hours}h ${mins}m`);
        } else {
          setRemainingTime(`${mins}m`);
        }
      }
    };
    
    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [block]);

  // Determine visual style based on block size
  const isLargeBlock = block.durationMinutes >= 120;
  const isMediumBlock = block.durationMinutes >= 60;

  // Use custom color if provided, otherwise use default colors
  let bgColor = isLargeBlock ? "#D1FAE5" : isMediumBlock ? "#FEF3C7" : "#F3F4F6";
  let borderColor = isLargeBlock ? "#10B981" : isMediumBlock ? "#F59E0B" : "#6B7280";
  let textColor = isLargeBlock ? "#047857" : isMediumBlock ? "#D97706" : "#4B5563";

  if (customColor) {
    borderColor = customColor;
    // Create a light version of the custom color for background
    bgColor = customColor + "20"; // Add 20% opacity
    textColor = customColor;
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
        },
      ]}
    >
      <View style={styles.timeRange}>
        <MaterialIcons name="schedule" size={14} color={textColor} />
        <Text style={[styles.time, { color: textColor }]}>
          {block.startTime}
        </Text>
        <Text style={[styles.arrow, { color: textColor }]}>→</Text>
        <Text style={[styles.time, { color: textColor }]}>
          {block.endTime}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: borderColor }]}>
        <Text style={styles.badgeText}>{remainingTime}</Text>
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
