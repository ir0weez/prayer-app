import { View, Text, Animated, Pressable, ScrollView } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useRef } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getIconForTodo } from "@/lib/prayercircle-data";

interface DailySummaryCardProps {
  remainingTodos: number;
  remainingPrayers: number;
  fastingStatus: string;
  budgetAmount: number;
  peopleToReach: number;
  currentBibleStudy: string;
  personalTodos?: any[];
  onTodoComplete?: (todoId: string) => void;
  eventCount?: number;
  ministryCount?: number;
}

// Map icon names from getIconForTodo to Material Icons
function iconName(icon: string | null | undefined): any {
  const iconMap: Record<string, any> = {
    "favorite": "favorite",
    "cleaning-services": "cleaning-services",
    "sentiment-satisfied": "sentiment-satisfied",
    "help": "help",
    "translate": "translate",
    "event": "event",
    "restaurant": "restaurant",
    "nights-stay": "nights-stay",
    "directions-run": "directions-run",
    "school": "school",
    "work": "work",
    "phone": "phone",
    "shopping-cart": "shopping-cart",
    "local-hospital": "local-hospital",
    "task-alt": "task-alt",
  };
  return iconMap[icon || ""] || "task-alt";
}

export function DailySummaryCard({
  remainingTodos,
  remainingPrayers,
  fastingStatus,
  budgetAmount,
  peopleToReach,
  currentBibleStudy,
  personalTodos = [],
  onTodoComplete,
  eventCount = 0,
  ministryCount = 0,
}: DailySummaryCardProps) {
  const colors = useColors();
  
  // Format fasting status for display
  const getFastingStatusDisplay = () => {
    switch (fastingStatus) {
      case 'complete':
        return 'Complete';
      case 'missed':
        return 'Missed';
      case 'skipped':
        return 'Skipped';
      default:
        return 'Not selected';
    }
  };
  
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

      {/* Summary paragraph - Joi style with white bold numbers and darker connecting words */}
      <View style={{ marginBottom: 16 }}>
        <Text
          style={{
            fontSize: 18,
            lineHeight: 28,
            color: colors.foreground,
            fontWeight: "500",
          }}
        >
          <Text style={{ color: colors.muted, fontWeight: "500" }}>You have </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>✓ {remainingTodos}</Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}> todo{remainingTodos !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, you are currently reading </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>
            <MaterialIcons name="school" size={20} color={colors.foreground} /> {currentBibleStudy}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, have </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>
            <MaterialIcons name="favorite" size={20} color={colors.foreground} /> {remainingPrayers}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}> prayer{remainingPrayers !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>
            <MaterialIcons name="attach-money" size={20} color={colors.foreground} /> {budgetAmount}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> to budget, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>
            <MaterialIcons name="people" size={20} color={colors.foreground} /> {peopleToReach}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> people to reach, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>{eventCount}</Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}> event{eventCount !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>{ministryCount}</Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}> ministr{ministryCount !== 1 ? "ies" : "y"}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, and your fasting is </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground, fontSize: 20 }}>{getFastingStatusDisplay()}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> today.</Text>
        </Text>
      </View>

      {/* Personal todos as horizontal scrollable avatars with thought bubbles */}
      {personalTodos && personalTodos.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 24 }}
            style={{ marginHorizontal: -24, paddingHorizontal: 24 }}
          >
            {personalTodos.map((todo, idx) => (
              <View
                key={idx}
                style={{
                  width: 86,
                  height: 110,
                  marginRight: 7,
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* Thought bubble label */}
                <View
                  style={{
                    position: "absolute",
                    top: 8,
                    right: -8,
                    zIndex: 4,
                    minHeight: 26,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 13,
                    borderWidth: 2,
                    borderColor: todo.color || colors.primary,
                    backgroundColor: "#FFFFFF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: todo.color || colors.primary,
                      fontSize: 11,
                      fontWeight: "800",
                      lineHeight: 13,
                    }}
                  >
                    {todo.title}
                  </Text>
                </View>

                {/* Avatar circle */}
                <Pressable
                  onPress={() => onTodoComplete && onTodoComplete(todo.id)}
                  style={({ pressed }) => [
                    {
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <View
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: 38,
                      borderWidth: 3,
                      borderColor: todo.isDone ? "#31C48D" : (todo.color || colors.primary),
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: todo.color || colors.primary,
                    }}
                  >
                    <MaterialIcons
                      name={iconName(getIconForTodo(todo.title))}
                      size={32}
                      color="#FFFFFF"
                    />
                  </View>
                </Pressable>

                {/* Checkmark overlay when done */}
                {todo.isDone && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "#31C48D",
                      alignItems: "center",
                      justifyContent: "center",
                      borderWidth: 2,
                      borderColor: colors.background,
                      zIndex: 10,
                    }}
                  >
                    <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "700" }}>✓</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {remainingTodos === 0 && remainingPrayers === 0 && (
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
