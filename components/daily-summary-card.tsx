import { View, Text, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useRef } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      {/* Header with day and date - Joi style, no card box */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 56,
            fontWeight: "800",
            color: colors.foreground,
            lineHeight: 60,
          }}
        >
          {dayName}
        </Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text
            style={{
              fontSize: 16,
              color: colors.muted,
              fontWeight: "500",
            }}
          >
            {monthName} {dayNum}
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: colors.muted,
              fontWeight: "500",
            }}
          >
            {yearNum}
          </Text>
        </View>
      </View>

      {/* Summary paragraph - Joi style, larger text */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 18,
            lineHeight: 28,
            color: colors.foreground,
            fontWeight: "500",
          }}
        >
          <Text style={{ fontWeight: "600" }}>You have </Text>
          <Text style={{ fontWeight: "700" }}>✓ {totalTodos} todo{totalTodos !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> and </Text>
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="favorite" size={18} color={colors.primary} /> {totalPrayers} prayer{totalPrayers !== 1 ? "s" : ""}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> today.</Text>
        </Text>
      </View>

      {/* Progress bar */}
      <View style={{ marginTop: 12 }}>
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
            fontSize: 13,
            color: colors.muted,
            textAlign: "center",
            marginTop: 6,
            fontWeight: "500",
          }}
        >
          {completedTodos + completedPrayers}/{totalTodos + totalPrayers} completed
        </Text>
      </View>

      {remainingTodos === 0 && remainingPrayers === 0 && totalTodos > 0 && totalPrayers > 0 && (
        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 16,
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
