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
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
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
    borderRadius: 16,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    zIndex: 10,
  },
});
