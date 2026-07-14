import { Animated, View, Text, Pressable, ScrollView, Modal } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getIconForTodo } from "@/lib/prayercircle-data";
import { getChapterCount } from "@/lib/bible-books";


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
  availableTimeString?: string;
  prayerStreak?: number;

  bibleStudyDays?: Array<{ dayName: string; date: string; book: string; chapter: number }>;
  selectedBibleStudyDay?: string | null;
  selectedDate?: string;
  onBibleStudyDayChange?: (dayName: string) => void;
  onDeleteBibleStudyDay?: (dayName: string) => void;
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
  bibleStudyDays = [],
  selectedBibleStudyDay = null,
  selectedDate,
  onBibleStudyDayChange,
  onDeleteBibleStudyDay,
  personalTodos = [],
  onTodoComplete,
  onAvatarPress,
  eventCount = 0,
  ministryCount = 0,
  userName = "Friend",
  userProfilePhoto,
  availableHours = 0,
  availableTimeString = "0h",
  prayerStreak = 0,

}: DailySummaryCardProps) {
  const colors = useColors();
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  
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
  
  // Get badge color based on fasting status
  const getBadgeColor = () => {
    switch (fastingStatus) {
      case 'complete':
        return '#22C55E'; // Green
      case 'missed':
        return '#EF4444'; // Red
      case 'skipped':
        return '#F59E0B'; // Yellow
      default:
        return colors.primary; // Primary color
    }
  };

  // Get the display day name for Bible study selector
  // Always show the day of week matching selectedDate (the currently viewed day)
  const getDefaultDay = () => {
    if (selectedBibleStudyDay) return selectedBibleStudyDay;
    if (selectedDate) {
      // Fix timezone: parse YYYY-MM-DD as local date, not UTC
      const parts = selectedDate.split('T')[0].split('-');
      const date = parts.length === 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(selectedDate);
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return bibleStudyDays[0]?.dayName || "";
  };
  const displayDay = getDefaultDay();

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
              backgroundColor: getBadgeColor(),
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
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="task-alt" size={16} color={colors.foreground} /> {remainingTodos} todo{remainingTodos !== 1 ? "s" : ""}
          </Text>
          , last{' '}
          {bibleStudyDays.length > 0 ? (
            <Text
              onPress={() => setShowDayDropdown(true)}
              style={{
                fontWeight: "700",
                color: colors.foreground,
                textDecorationLine: "underline",
                textDecorationStyle: "dashed",
                textDecorationColor: colors.primary,
              }}
            >
              {displayDay}
            </Text>
          ) : (
            <Text style={{ fontWeight: "700" }}>{displayDay}</Text>
          )}
          {' '}bible study{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="school" size={16} color={colors.foreground} /> {currentBibleStudy || 'none'}
          </Text>
          , have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="favorite" size={16} color={colors.foreground} /> {remainingPrayers} prayer{remainingPrayers !== 1 ? "s" : ""}
          </Text>
          , <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="account-balance-wallet" size={16} color={colors.foreground} /> ${budgetAmount.toFixed(2)}
          </Text> to budget,{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="people" size={16} color={colors.foreground} /> {peopleToReach} people
          </Text> to reach, {' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="event" size={16} color={colors.foreground} /> {eventCount} event{eventCount !== 1 ? "s" : ""}
          </Text>, and{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="volunteer-activism" size={16} color={colors.foreground} /> {ministryCount} ministries
          </Text> to lead. You have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="schedule" size={16} color={colors.foreground} /> {availableTimeString}
          </Text>{' '}available.
        </Text>
      </View>

      {/* Bible Study Day Selector Modal - rendered OUTSIDE the Text element */}
      {bibleStudyDays.length > 0 && (
        <Modal
          visible={showDayDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDayDropdown(false)}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => setShowDayDropdown(false)}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 20,
                paddingBottom: 40,
              }}
              onStartShouldSetResponder={() => true}
            >
              {/* Handle bar */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: colors.border,
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.foreground,
                  marginBottom: 12,
                }}
              >
                Select Bible Study Day
              </Text>

              <ScrollView
                style={{ maxHeight: 300 }}
                showsVerticalScrollIndicator={true}
              >
                {bibleStudyDays.map((day) => (
                  <View
                    key={day.dayName}
                    style={{
                      marginVertical: 8,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      borderWidth: displayDay === day.dayName ? 2 : 1,
                      borderColor: displayDay === day.dayName ? colors.primary : colors.border,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                    <Pressable
                      onPress={() => {
                        if (onBibleStudyDayChange) {
                          onBibleStudyDayChange(day.dayName);
                        }
                        setShowDayDropdown(false);
                      }}
                      style={({ pressed }) => [{
                        flex: 1,
                        paddingVertical: 16,
                        paddingHorizontal: 16,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <View>
                        {/* Title */}
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: "600",
                            fontSize: 16,
                            marginBottom: 12,
                          }}
                        >
                          {day.dayName}
                        </Text>
                        
                        {/* Book */}
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            fontWeight: '500',
                            marginBottom: 2,
                          }}
                        >
                          BOOK
                        </Text>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 14,
                            fontWeight: '500',
                            marginBottom: 12,
                          }}
                        >
                          {day.book}
                        </Text>
                        
                        {/* Chapter Progress */}
                        <Text
                          style={{
                            color: colors.muted,
                            fontSize: 12,
                            fontWeight: '500',
                            marginBottom: 2,
                          }}
                        >
                          PROGRESS
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: colors.foreground, fontWeight: '500' }}>
                            {day.chapter} of {getChapterCount(day.book)} chapters
                          </Text>
                          <Text style={{ fontSize: 13, color: colors.primary, fontWeight: '600' }}>
                            {Math.round((day.chapter / getChapterCount(day.book)) * 100)}%
                          </Text>
                        </View>
                        <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                          <View
                            style={{
                              height: '100%',
                              width: `${(day.chapter / getChapterCount(day.book)) * 100}%`,
                              backgroundColor: colors.primary,
                            }}
                          />
                        </View>
                      </View>
                    </Pressable>
                    {onDeleteBibleStudyDay && (
                      <Pressable
                        onPress={() => {
                          onDeleteBibleStudyDay(day.dayName);
                          setShowDayDropdown(false);
                        }}
                        style={({ pressed }) => [{
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          opacity: pressed ? 0.5 : 1,
                        }]}
                      >
                        <MaterialIcons name="delete" size={18} color={colors.error} />
                      </Pressable>
                    )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}

    </Animated.View>
  );
}
