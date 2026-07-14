import { View, Text, Pressable, ScrollView, Modal, Animated } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useEffect, useRef, useState } from "react";
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
  const [selectedBibleStudyDetail, setSelectedBibleStudyDetail] = useState<any>(null);
  
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

      {/* Bible Study Days List */}
      {bibleStudyDays.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: colors.muted, fontWeight: "500", marginBottom: 8 }}>BIBLE STUDY DAYS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 8 }}>
            {bibleStudyDays.map((day) => (
              <Pressable
                key={day.dayName}
                onPress={() => {
                  setSelectedBibleStudyDetail(day);
                  setShowDayDropdown(true);
                }}
                style={({ pressed }) => [{
                  backgroundColor: displayDay === day.dayName ? colors.primary : colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  opacity: pressed ? 0.8 : 1,
                  marginRight: 8,
                }]}
              >
                <Text style={{
                  color: displayDay === day.dayName ? '#fff' : colors.foreground,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                  {day.dayName}: {day.book} {day.chapter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bible Study Detail Bottom Sheet */}
      {selectedBibleStudyDetail && (
        <Modal
          visible={showDayDropdown}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setShowDayDropdown(false);
            setSelectedBibleStudyDetail(null);
          }}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "flex-end",
            }}
            onPress={() => {
              setShowDayDropdown(false);
              setSelectedBibleStudyDetail(null);
            }}
          >
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
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
                marginBottom: 20,
              }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: colors.foreground,
                }}>
                  {selectedBibleStudyDetail.book}
                </Text>
                {onDeleteBibleStudyDay && (
                  <Pressable
                    onPress={() => {
                      onDeleteBibleStudyDay(selectedBibleStudyDetail.dayName);
                      setShowDayDropdown(false);
                      setSelectedBibleStudyDetail(null);
                    }}
                    style={({ pressed }) => [{
                      opacity: pressed ? 0.5 : 1,
                    }]}
                  >
                    <MaterialIcons name="delete" size={24} color={colors.error} />
                  </Pressable>
                )}
              </View>

              <View style={{ gap: 16 }}>
                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 4 }}>DAY</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                    {selectedBibleStudyDetail.dayName}
                  </Text>
                </View>

                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 4 }}>CHAPTER</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                    Chapter {selectedBibleStudyDetail.chapter}
                  </Text>
                </View>

                <View style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16 }}>
                  <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 4 }}>DATE ADDED</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
                    {new Date(selectedBibleStudyDetail.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Modal>
      )}

    </Animated.View>
  );
}
