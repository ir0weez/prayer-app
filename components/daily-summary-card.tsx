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
  return iconMap[icon as string] || "circle";
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
      case "fasting":
        return "fasting";
      case "feasting":
        return "feasting";
      default:
        return "not fasting";
    }
  };

  // Animation setup
  const slideAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get default day from selectedBibleStudyDay or selectedDate or first bibleStudyDay
  const getDefaultDay = () => {
    if (selectedBibleStudyDay) {
      return selectedBibleStudyDay;
    }
    if (selectedDate) {
      const date =
        typeof selectedDate === "string"
          ? new Date(selectedDate)
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
          
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              marginLeft: 8,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              {userName}
            </Text>
          </View>
          <Text style={{ fontSize: 18, color: colors.muted, fontWeight: "500" }}>
            .
          </Text>
        </View>

        <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 22 }}>
          You have <MaterialIcons name="task-alt" size={16} color={colors.foreground} /> {remainingTodos} todo{remainingTodos !== 1 ? "s" : ""}
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
            <MaterialIcons name="favorite" size={16} color={colors.foreground} /> {remainingPrayers} prayers
          </Text>
          , <MaterialIcons name="credit-card" size={16} color={colors.foreground} /> ${budgetAmount.toFixed(2)} to budget, <MaterialIcons name="people" size={16} color={colors.foreground} /> {peopleToReach} people to reach, <MaterialIcons name="event" size={16} color={colors.foreground} /> {eventCount} events, and <MaterialIcons name="volunteer-activism" size={16} color={colors.foreground} /> {ministryCount} ministries to lead. You have <MaterialIcons name="schedule" size={16} color={colors.foreground} /> {availableTimeString} available.
        </Text>
      </View>

      {/* Bible Study Day Selector Modal - Bottom Sheet */}
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
                  marginBottom: 16,
                }}
              >
                Select Bible Study Day
              </Text>

              <ScrollView
                style={{ maxHeight: 400 }}
                showsVerticalScrollIndicator={true}
              >
                {bibleStudyDays.map((day) => (
                  <View
                    key={day.dayName}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginVertical: 8,
                      borderRadius: 12,
                      backgroundColor:
                        displayDay === day.dayName
                          ? colors.primary + "20"
                          : colors.background,
                      borderWidth: displayDay === day.dayName ? 1 : 0,
                      borderColor:
                        displayDay === day.dayName ? colors.primary : "transparent",
                      overflow: 'hidden',
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
                        paddingVertical: 14,
                        paddingHorizontal: 14,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      <View>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontWeight: displayDay === day.dayName ? "700" : "600",
                            fontSize: 15,
                            marginBottom: 6,
                          }}
                        >
                          {day.dayName}: {day.book}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 13, color: colors.muted }}>
                            Chapter {day.chapter} of {getChapterCount(day.book)}
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
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </Pressable>
                    )}
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
