import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface EmergencyPrayerPillProps {
  timeRemaining: string;
  progress?: number; // 0 to 1, where 1 is full and 0 is empty
}

export function EmergencyPrayerPill({ timeRemaining, progress = 1 }: EmergencyPrayerPillProps) {
  return (
    <View style={styles.container}>
      {/* Depleting red progress fill */}
      <View
        style={[
          styles.progressFill,
          {
            width: `${Math.round(progress * 100)}%`,
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
    backgroundColor: "#1F2937",
    borderWidth: 1,
    borderColor: "#DC2626",
  },
  progressFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#EF4444",
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
