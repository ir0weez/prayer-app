import { Animated, Image, View, Text } from "react-native";
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
  
  // Get badge color based on fasting status
  const getBadgeColor = () => {
    switch (fastingStatus) {
      case 'complete':
        return '#22C55E'; // Green
      case 'missed':
        return '#F59E0B'; // Yellow/Orange
      case 'skipped':
        return '#EF4444'; // Red
      default:
        return colors.primary; // Default app color
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
      {/* Summary paragraph with greeting and profile badge */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 18, color: colors.muted, fontWeight: "500" }}>
            {getTimeBasedGreeting()},{" "}
          </Text>
          <View
            style={{
              backgroundColor: getBadgeColor(),
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              position: 'relative',
            }}
          >
            <Text style={{ fontWeight: "700", color: "#FFFFFF", fontSize: 16 }}>
              {userName}
            </Text>
            {prayerStreak > 0 && (
              <View
                style={{
                  backgroundColor: '#FF6B6B',
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  right: -8,
                  top: -8,
                  borderWidth: 2,
                  borderColor: colors.background,
                }}
              >
                <Text style={{ fontWeight: "700", color: "#FFFFFF", fontSize: 12 }}>
                  {prayerStreak}
                </Text>
              </View>
            )}
          </View>
          {userProfilePhoto && (
            <Image
              source={{ uri: userProfilePhoto }}
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.primary,
                marginLeft: 8,
              }}
            />
          )}
          {!userProfilePhoto && (
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <MaterialIcons name="person" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>
        
        <Text
          style={{
            fontSize: 16,
            lineHeight: 24,
            color: colors.foreground,
            fontWeight: "500",
          }}
        >
          <Text style={{ color: colors.muted, fontWeight: "500" }}>You have </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>✓ {remainingTodos}</Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> todo{remainingTodos !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, you are currently reading </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            📖 {currentBibleStudy}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, have </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            ❤️ {remainingPrayers}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> prayer{remainingPrayers !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            💵 ${budgetAmount.toFixed(2)}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> to budget, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            👥 {peopleToReach}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> people to reach</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            📅 {eventCount}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> event{eventCount !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            🏛️ {ministryCount}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> ministr{ministryCount !== 1 ? "ies" : "y"}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}>, </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            ⏰ {availableHours}
          </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}> hour{availableHours !== 1 ? "s" : ""}</Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> available, and your fasting is </Text>
          <Text style={{ fontWeight: "700", color: colors.foreground }}>
            {getFastingStatusDisplay()}
          </Text>
          <Text style={{ color: colors.muted, fontWeight: "500" }}> today.</Text>
        </Text>
      </View>
    </Animated.View>
  );
}
