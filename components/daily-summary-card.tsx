import { View, Text, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useRef } from "react";

interface DailySummaryCardProps {
  totalTodos: number;
  completedTodos: number;
  totalPrayers: number;
  completedPrayers: number;
}

export function DailySummaryCard({
  totalTodos,
  completedTodos,
  totalPrayers,
  completedPrayers,
}: DailySummaryCardProps) {
  const colors = useColors();
  const remainingTodos = totalTodos - completedTodos;
  const remainingPrayers = totalPrayers - completedPrayers;
  
  // Scroll-up animation
  const slideAnim = useRef(new Animated.Value(30)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // Get today's date in PST
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const dayName = parts.find(p => p.type === 'weekday')?.value || '';
  const monthName = parts.find(p => p.type === 'month')?.value || '';
  const dayNum = parts.find(p => p.type === 'day')?.value || '';
  const yearNum = parts.find(p => p.type === 'year')?.value || '';

  return (
    <Animated.View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      {/* Header with day and date - Joi style */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 48,
            fontWeight: "800",
            color: colors.foreground,
          }}
        >
          {dayName}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 14,
              color: colors.muted,
            }}
          >
            {monthName} {dayNum}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: colors.muted,
            }}
          >
            {yearNum}
          </Text>
        </View>
      </View>

      {/* Summary paragraph - Joi style */}
      <View style={{ marginBottom: 12 }}>
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.foreground,
          }}
        >
          <Text style={{ fontWeight: "600" }}>You have </Text>
          <Text style={{ fontWeight: "600" }}>✓ {totalTodos} todo{totalTodos !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted }}> and </Text>
          <Text style={{ fontWeight: "600" }}>💜 {totalPrayers} prayer{totalPrayers !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted }}> today.</Text>
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 8 }}>
        <View
          style={{
            height: 6,
            backgroundColor: colors.border,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: "100%",
              width: `${totalTodos + totalPrayers > 0 ? ((completedTodos + completedPrayers) / (totalTodos + totalPrayers)) * 100 : 0}%`,
              backgroundColor: colors.primary,
            }}
          />
        </View>
        <Text
          style={{
            fontSize: 12,
            color: colors.muted,
            textAlign: "center",
            marginTop: 4,
          }}
        >
          {completedTodos + completedPrayers}/{totalTodos + totalPrayers} completed
        </Text>
      </View>

      {remainingTodos === 0 && remainingPrayers === 0 && totalTodos > 0 && totalPrayers > 0 && (
        <View
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: colors.success,
              textAlign: "center",
            }}
          >
            ✨ All done for today!
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
