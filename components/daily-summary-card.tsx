import { View, Text, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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

  return (
    <Animated.View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 12,
        borderWidth: 1,
        borderColor: colors.border,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: colors.foreground,
          marginBottom: 12,
        }}
      >
        Today's Summary
      </Text>

      <View style={{ gap: 8 }}>
        {/* Todos summary */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialIcons name="checklist" size={20} color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>
            <Text style={{ fontWeight: "600" }}>
              {remainingTodos} {remainingTodos === 1 ? "Todo" : "Todos"}
            </Text>
            <Text style={{ color: colors.muted }}> remaining</Text>
          </Text>
          {totalTodos > 0 && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {completedTodos}/{totalTodos}
            </Text>
          )}
        </View>

        {/* Prayers summary */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <MaterialIcons name="favorite" size={20} color={colors.primary} />
          <Text style={{ fontSize: 14, color: colors.foreground, flex: 1 }}>
            <Text style={{ fontWeight: "600" }}>
              {remainingPrayers} {remainingPrayers === 1 ? "Prayer" : "Prayers"}
            </Text>
            <Text style={{ color: colors.muted }}> remaining</Text>
          </Text>
          {totalPrayers > 0 && (
            <Text style={{ fontSize: 12, color: colors.muted }}>
              {completedPrayers}/{totalPrayers}
            </Text>
          )}
        </View>

        {/* Completion status */}
        {remainingTodos === 0 && remainingPrayers === 0 && totalTodos > 0 && totalPrayers > 0 && (
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.primary,
                textAlign: "center",
              }}
            >
              ✨ All done for today!
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
