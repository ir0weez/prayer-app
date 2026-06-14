import { Animated, Image, Text, View } from "react-native";
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
  onAvatarPress?: (todo: any) => void;
  eventCount?: number;
  ministryCount?: number;
  userName?: string;
  userProfilePhoto?: string;
  availableHours?: number;
  prayerStreak?: number;
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
  onAvatarPress,
  eventCount = 0,
  ministryCount = 0,
  userName = "Friend",
  userProfilePhoto,
  availableHours = 0,
  prayerStreak = 0,
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
  
  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

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
      {/* Summary with greeting and profile badge */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 18, color: colors.muted, fontWeight: "500" }}>
            {getTimeBasedGreeting()}, 
          </Text>
          
          {/* Profile Badge */}
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginLeft: 4,
            }}
          >
            <Text style={{ fontWeight: "700", color: "#FFFFFF", fontSize: 16 }}>
              {userName}
            </Text>
            {prayerStreak > 0 && (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "#FFFFFF",
                }}
              >
                <Text style={{ fontWeight: "700", color: "#FFFFFF", fontSize: 11 }}>
                  {prayerStreak}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 18, color: colors.muted, fontWeight: "500", marginLeft: 4 }}>.</Text>
        </View>

        {/* Summary text */}
        <Text style={{ fontSize: 16, lineHeight: 24, color: colors.foreground, fontWeight: "400" }}>
          You have{' '}
          <Text style={{ fontWeight: "700" }}>✓ {remainingTodos} todo{remainingTodos !== 1 ? "s" : ""}</Text>
          , you are currently reading{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="school" size={16} color={colors.foreground} /> {currentBibleStudy}
          </Text>
          , have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="favorite" size={16} color={colors.foreground} /> {remainingPrayers} prayer{remainingPrayers !== 1 ? "s" : ""}
          </Text>
          , <Text style={{ fontWeight: "700" }}>$ {budgetAmount.toFixed(2)}</Text> to budget,{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="people" size={16} color={colors.foreground} /> {peopleToReach} people to reach
          </Text>
          , <Text style={{ fontWeight: "700" }}>{eventCount} event{eventCount !== 1 ? "s" : ""}</Text>,{' '}
          <Text style={{ fontWeight: "700" }}>{ministryCount} ministries</Text>, <Text style={{ fontWeight: "700" }}>{availableHours} hours</Text> available, and your fasting is{' '}
          <Text style={{ fontWeight: "700" }}>{getFastingStatusDisplay()}</Text> today.
        </Text>
      </View>
    </Animated.View>
  );
}
