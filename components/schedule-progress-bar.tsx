import { View, Text } from "react-native";
import { useState } from "react";
import { useColors } from "@/hooks/use-colors";

interface ScheduleProgressBarProps {
  completed: number;
  total: number;
  label?: string;
}

export function ScheduleProgressBar({ completed, total, label = "Progress" }: ScheduleProgressBarProps) {
  const colors = useColors();
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = total > 0 && completed >= total;

  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
      {/* Label and count */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
          {label}
        </Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {completed} of {total}
        </Text>
      </View>

      {/* Progress bar container */}
      <View
        style={{
          position: "relative",
          height: 6,
          backgroundColor: colors.border,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        {/* Regular progress bar fill with glow when complete */}
        <View
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: isComplete ? "#10B981" : colors.primary,
            borderRadius: 3,
            shadowColor: isComplete ? "#10B981" : "transparent",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isComplete ? 0.8 : 0,
            shadowRadius: isComplete ? 6 : 0,
            elevation: isComplete ? 8 : 0,
          }}
        />
      </View>
    </View>
  );
}
