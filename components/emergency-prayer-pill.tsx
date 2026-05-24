import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";

interface EmergencyPrayerPillProps {
  timeRemaining: string;
  progress?: number; // 0 to 1, where 1 is full and 0 is empty
}

export function EmergencyPrayerPill({ timeRemaining, progress = 1 }: EmergencyPrayerPillProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.error }]}>
      {/* Depleting red progress fill */}
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: colors.error,
          },
        ]}
      />

      {/* Time remaining text overlay */}
      <Text style={styles.timeText}>{timeRemaining}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: 58,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 13,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 15,
    zIndex: 10,
  },
});
