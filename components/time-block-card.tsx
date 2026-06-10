import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { TimeBlock } from "@/lib/time-blocks";

interface TimeBlockCardProps {
  block: TimeBlock;
  index: number;
  totalBlocks: number;
}

/**
 * Visual component for displaying an available time block (white space)
 * Shows start time, end time, and available duration
 */
export function TimeBlockCard({ block, index, totalBlocks }: TimeBlockCardProps) {
  const colors = useColors();

  // Determine visual prominence based on block size
  const isLargeBlock = block.durationMinutes >= 120; // 2+ hours
  const isMediumBlock = block.durationMinutes >= 60; // 1+ hour
  const isSmallBlock = block.durationMinutes < 60; // Less than 1 hour

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          marginHorizontal: 16,
          marginVertical: 8,
        },
      ]}
    >
      {/* Header with time range */}
      <View style={styles.header}>
        <View style={styles.timeRange}>
          <Text style={[styles.time, { color: colors.foreground }]}>
            {block.startTime}
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={16}
            color={colors.muted}
            style={{ marginHorizontal: 8 }}
          />
          <Text style={[styles.time, { color: colors.foreground }]}>
            {block.endTime}
          </Text>
        </View>

        {/* Duration badge */}
        <View
          style={[
            styles.durationBadge,
            {
              backgroundColor: isLargeBlock
                ? "#10B981"
                : isMediumBlock
                  ? "#F59E0B"
                  : "#6B7280",
            },
          ]}
        >
          <Text style={styles.durationText}>{block.label}</Text>
        </View>
      </View>

      {/* Visual bar showing time block */}
      <View
        style={[
          styles.visualBar,
          {
            backgroundColor: isLargeBlock
              ? "#D1FAE5"
              : isMediumBlock
                ? "#FEF3C7"
                : "#F3F4F6",
            borderLeftColor: isLargeBlock
              ? "#10B981"
              : isMediumBlock
                ? "#F59E0B"
                : "#6B7280",
          },
        ]}
      >
        <View style={styles.barContent}>
          <MaterialIcons
            name="schedule"
            size={16}
            color={
              isLargeBlock ? "#047857" : isMediumBlock ? "#D97706" : "#4B5563"
            }
          />
          <Text
            style={[
              styles.barLabel,
              {
                color: isLargeBlock
                  ? "#047857"
                  : isMediumBlock
                    ? "#D97706"
                    : "#4B5563",
              },
            ]}
          >
            {isLargeBlock
              ? "Great opportunity for deep work"
              : isMediumBlock
                ? "Good time for focused tasks"
                : "Quick task window"}
          </Text>
        </View>
      </View>

      {/* Suggested activities */}
      <View style={styles.suggestionsContainer}>
        <Text style={[styles.suggestionsLabel, { color: colors.muted }]}>
          Good for:
        </Text>
        <View style={styles.suggestionsList}>
          {isLargeBlock && (
            <>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>📚 Strategic Planning</Text>
              </View>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>💭 Deep Work</Text>
              </View>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>🤝 Mentoring</Text>
              </View>
            </>
          )}
          {isMediumBlock && (
            <>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>✍️ Writing/Planning</Text>
              </View>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>📞 Important Calls</Text>
              </View>
            </>
          )}
          {isSmallBlock && (
            <>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>✓ Quick Tasks</Text>
              </View>
              <View style={styles.suggestionTag}>
                <Text style={styles.suggestionText}>☕ Break Time</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  timeRange: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  time: {
    fontSize: 16,
    fontWeight: "600",
  },
  durationBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 12,
  },
  durationText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  visualBar: {
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  barContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  suggestionsContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionTag: {
    backgroundColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
