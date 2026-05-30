import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import {
  addDays,
  BirthdayEvent,
  createScheduleEvent,
  createScheduleMinistry,
  createScheduleTodo,
  detectEventKeyword,
  EVENT_KEYWORD_MAP,
  EventKeyword,
  formatDateHeader,
  generateId,
  getBirthdaysForDate,
  getDayNumber,
  getEventsForDate,
  getMinistriesForDate,
  getShortDayName,
  getTodosForDate,
  getWeekDates,
  MINISTRY_TYPES,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  ScheduleEvent,
  ScheduleMinistry,
  ScheduleTodo,
  toggleEventCompleted,
  toggleMinistryCompleted,
  toggleTodoCompleted,
} from "@/lib/schedule-data";
import { getTodayISOString, type Person } from "@/lib/prayercircle-data";
import { getActiveFast, type PersonalFast } from "@/lib/prayercircle-fasting";
import { DailySummaryCard } from "@/components/daily-summary-card";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_HEADER_HEIGHT = 140;
const SUMMARY_HEIGHT = 280; // Approximate height of the DailySummaryCard
const TOTAL_HEADER_HEIGHT = DAY_HEADER_HEIGHT + SUMMARY_HEIGHT;

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

// ─── Flame Spark Animation Component ────────────────────────────────────────
function FlameSparkIcon({ isCompleted }: { isCompleted: boolean }) {
  const sparkScale = useSharedValue(1);
  const sparkOpacity = useSharedValue(0.6);
  const sparkRotation = useSharedValue(0);

  useEffect(() => {
    if (isCompleted) {
      sparkScale.value = withSequence(
        withTiming(1.4, { duration: 150 }),
        withTiming(1, { duration: 200 })
      );
      sparkOpacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withTiming(0.8, { duration: 300 })
      );
      sparkRotation.value = withSequence(
        withTiming(10, { duration: 100 }),
        withTiming(-10, { duration: 100 }),
        withTiming(5, { duration: 80 }),
        withTiming(0, { duration: 80 })
      );
    }
  }, [isCompleted, sparkScale, sparkOpacity, sparkRotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: sparkScale.value },
      { rotate: `${sparkRotation.value}deg` },
    ],
    opacity: sparkOpacity.value,
  }));

  return (
    <ReAnimated.View style={animatedStyle}>
      <Text style={{ fontSize: 18 }}>{isCompleted ? "🔥" : "🔲"}</Text>
    </ReAnimated.View>
  );
}

// ─── Event Card Component ────────────────────────────────────────────────────
function EventCard({
  event,
  onToggle,
}: {
  event: ScheduleEvent;
  onToggle: () => void;
}) {
  const colors = useColors();
  const keyword = event.keyword ? EVENT_KEYWORD_MAP.find((k) => k.label === event.keyword) : detectEventKeyword(event.title);
  const cardScale = useSharedValue(1);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  if (event.isCompleted) {
    // Completed: solid color box, smaller
    const completedColor = keyword?.accentColor || colors.muted;
    return (
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[animatedCardStyle]}>
          <View style={[eventStyles.completedCard, { backgroundColor: completedColor + "30", borderColor: completedColor + "50" }]}>
            <View style={[eventStyles.completedDot, { backgroundColor: completedColor }]} />
            <Text style={[eventStyles.completedTitle, { color: completedColor }]} numberOfLines={1}>
              {event.title}
            </Text>
            {event.startTime && (
              <Text style={[eventStyles.completedTime, { color: completedColor + "99" }]}>
                {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
              </Text>
            )}
            <MaterialIcons name="check-circle" size={18} color={completedColor} style={{ marginLeft: "auto" }} />
          </View>
        </ReAnimated.View>
      </Pressable>
    );
  }

  // Active: illustrated card if keyword matches
  if (keyword) {
    return (
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={[eventStyles.illustratedCard, { backgroundColor: keyword.bgColor, borderColor: keyword.accentColor + "40" }]}>
          <View style={eventStyles.illustratedContent}>
            <Text style={[eventStyles.illustratedTitle, { color: keyword.textColor }]}>{event.title}</Text>
            {event.startTime && (
              <Text style={[eventStyles.illustratedTime, { color: keyword.textColor + "BB" }]}>
                {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
              </Text>
            )}
            {event.location && (
              <Text style={[eventStyles.illustratedLocation, { color: keyword.textColor + "99" }]} numberOfLines={1}>
                📍 {event.location}
              </Text>
            )}
          </View>
          <Text style={eventStyles.illustratedEmoji}>{keyword.emoji}</Text>
        </View>
      </Pressable>
    );
  }

  // Default event card (no keyword match)
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={({ pressed }) => [pressed && { opacity: 0.85 }]}
    >
      <View style={[eventStyles.defaultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[eventStyles.defaultDot, { backgroundColor: event.color || colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={[eventStyles.defaultTitle, { color: colors.foreground }]}>{event.title}</Text>
          {event.startTime && (
            <Text style={[eventStyles.defaultTime, { color: colors.muted }]}>
              {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Todo Item Component ─────────────────────────────────────────────────────
function TodoItem({
  todo,
  onToggle,
}: {
  todo: ScheduleTodo;
  onToggle: () => void;
}) {
  const colors = useColors();

  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={({ pressed }) => [todoStyles.row, pressed && { opacity: 0.7 }]}
    >
      <FlameSparkIcon isCompleted={todo.isCompleted} />
      <Text
        style={[
          todoStyles.title,
          { color: colors.foreground },
          todo.isCompleted && { textDecorationLine: "line-through", color: colors.muted },
        ]}
        numberOfLines={1}
      >
        {todo.title}
      </Text>
    </Pressable>
  );
}

// ─── Ministry Card Component ─────────────────────────────────────────────────
function MinistryCard({
  ministry,
  onToggle,
}: {
  ministry: ScheduleMinistry;
  onToggle: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={({ pressed }) => [pressed && { opacity: 0.7 }]}
    >
      <View style={[ministryStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[ministryStyles.typeTag, { backgroundColor: ministry.color || "#7C5CFF" }]}>
          <Text style={ministryStyles.typeText}>{ministry.type}</Text>
        </View>
        <Text style={[ministryStyles.title, { color: colors.foreground }, ministry.isCompleted && { textDecorationLine: "line-through", color: colors.muted }]}>
          {ministry.title}
        </Text>
        {ministry.location && (
          <Text style={[ministryStyles.location, { color: colors.muted }]} numberOfLines={1}>
            📍 {ministry.location}
          </Text>
        )}
        {ministry.startTime && (
          <Text style={[ministryStyles.time, { color: colors.muted }]}>
            {ministry.startTime}{ministry.endTime ? ` – ${ministry.endTime}` : ""}
          </Text>
        )}
        {ministry.isCompleted && (
          <View style={ministryStyles.checkBadge}>
            <MaterialIcons name="check-circle" size={16} color="#22C55E" />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Birthday Card Component ─────────────────────────────────────────────────
function BirthdayCard({ birthday }: { birthday: BirthdayEvent }) {
  return (
    <View style={birthdayStyles.card}>
      <Text style={birthdayStyles.emoji}>🎂</Text>
      <Text style={birthdayStyles.text}>{birthday.personName}'s Birthday</Text>
    </View>
  );
}

// ─── Expandable Section ──────────────────────────────────────────────────────
function ExpandableSection({
  title,
  icon,
  children,
  defaultExpanded = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colors = useColors();
  const rotateAnim = useSharedValue(defaultExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 90])}deg` }],
  }));

  return (
    <View style={[expandStyles.container, { borderColor: colors.border }]}>
      <Pressable
        onPress={() => {
          const next = !expanded;
          setExpanded(next);
          rotateAnim.value = withTiming(next ? 1 : 0, { duration: 200 });
        }}
        style={({ pressed }) => [expandStyles.header, pressed && { opacity: 0.7 }]}
      >
        <MaterialIcons name={iconName(icon)} size={20} color={colors.primary} />
        <Text style={[expandStyles.title, { color: colors.foreground }]}>{title}</Text>
        <ReAnimated.View style={chevronStyle}>
          <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
        </ReAnimated.View>
      </Pressable>
      {expanded && <View style={expandStyles.content}>{children}</View>}
    </View>
  );
}

// ─── Main Schedule Tab Component ─────────────────────────────────────────────
interface ScheduleTabProps {
  people: Person[];
  fasts: PersonalFast[];
  // Summary data for the DailySummaryCard
  remainingTodos?: number;
  remainingPrayers?: number;
  fastingStatus?: string;
  budgetAmount?: number;
  peopleToReach?: number;
  currentBibleStudy?: string;
  personalTodos?: any[];
  onTodoComplete?: (todoId: string) => void;
}

export function ScheduleTab({
  people,
  fasts,
  remainingTodos = 0,
  remainingPrayers = 0,
  fastingStatus = 'not-selected',
  budgetAmount = 0,
  peopleToReach = 0,
  currentBibleStudy = 'Genesis 1',
  personalTodos = [],
  onTodoComplete,
}: ScheduleTabProps) {
  const colors = useColors();
  const today = getTodayISOString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [ministries, setMinistries] = useState<ScheduleMinistry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"event" | "todo" | "ministry" | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formMinistryType, setFormMinistryType] = useState("Outreach");
  const [formDueDate, setFormDueDate] = useState("");

  // Scroll animation - summary hides on scroll up, shows on scroll down
  const scrollY = useRef(new Animated.Value(0)).current;
  const summaryOpacity = scrollY.interpolate({
    inputRange: [0, SUMMARY_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const summaryTranslateY = scrollY.interpolate({
    inputRange: [0, SUMMARY_HEIGHT],
    outputRange: [0, -SUMMARY_HEIGHT],
    extrapolate: "clamp",
  });
  // The day header (date strip) stays visible but slides up when summary collapses
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, DAY_HEADER_HEIGHT / 2],
    outputRange: [1, 1],
    extrapolate: "clamp",
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, SUMMARY_HEIGHT],
    outputRange: [SUMMARY_HEIGHT, 0],
    extrapolate: "clamp",
  });

  // Swipe between days
  const swipeTranslateX = useSharedValue(0);

  const handleSwipeLeft = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, 1));
  }, []);

  const handleSwipeRight = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -1));
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-30, 30])
    .onUpdate((e) => {
      swipeTranslateX.value = e.translationX * 0.3;
    })
    .onEnd((e) => {
      if (e.translationX < -80) {
        runOnJS(handleSwipeLeft)();
      } else if (e.translationX > 80) {
        runOnJS(handleSwipeRight)();
      }
      swipeTranslateX.value = withTiming(0, { duration: 200 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeTranslateX.value }],
  }));

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, todosData, ministriesData] = await Promise.all([
          AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
          AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
          AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
        ]);
        if (eventsData) setEvents(JSON.parse(eventsData));
        if (todosData) setTodos(JSON.parse(todosData));
        if (ministriesData) setMinistries(JSON.parse(ministriesData));
      } catch (e) {
        // Silent fail
      }
    };
    loadData();
  }, []);

  // Save data
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_EVENTS_KEY, JSON.stringify(events)).catch(() => undefined);
  }, [events]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(todos)).catch(() => undefined);
  }, [todos]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(ministries)).catch(() => undefined);
  }, [ministries]);

  // Derived data for selected date
  const dateHeader = useMemo(() => formatDateHeader(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const dayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const dayTodos = useMemo(() => getTodosForDate(todos, selectedDate), [todos, selectedDate]);
  const dayMinistries = useMemo(() => getMinistriesForDate(ministries, selectedDate), [ministries, selectedDate]);
  const dayBirthdays = useMemo(() => getBirthdaysForDate(people, selectedDate), [people, selectedDate]);

  // Fasting info for expandable card
  const activeFast = useMemo(() => getActiveFast(fasts, selectedDate), [fasts, selectedDate]);

  // Current Bible book from AsyncStorage
  const [currentBibleBook, setCurrentBibleBook] = useState<string | null>(null);
  useEffect(() => {
    AsyncStorage.getItem("bibleBookStatus").then((data) => {
      if (data) {
        const statuses = JSON.parse(data);
        const current = Object.entries(statuses).find(([_, s]) => s === "current");
        if (current) setCurrentBibleBook(current[0]);
      }
    }).catch(() => undefined);
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormTitle("");
    setFormDate("");
    setFormStartTime("");
    setFormEndTime("");
    setFormLocation("");
    setFormNotes("");
    setFormMinistryType("Outreach");
    setFormDueDate("");
  };

  const handleSaveEvent = () => {
    if (!formTitle.trim()) return;
    const newEvent = createScheduleEvent({
      title: formTitle.trim(),
      date: formDate || selectedDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
    });
    setEvents((prev) => [...prev, newEvent]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveTodo = () => {
    if (!formTitle.trim()) return;
    const newTodo = createScheduleTodo(
      { title: formTitle.trim(), date: formDate || selectedDate },
      todos.filter((t) => t.date === (formDate || selectedDate)).length
    );
    setTodos((prev) => [...prev, newTodo]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveMinistry = () => {
    if (!formTitle.trim()) return;
    const newMinistry = createScheduleMinistry({
      title: formTitle.trim(),
      type: formMinistryType,
      date: formDate || selectedDate,
      dueDate: formDueDate || undefined,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
    });
    setMinistries((prev) => [...prev, newMinistry]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  // Build flat list data
  const listData = useMemo(() => {
    const items: Array<{ type: string; id: string; data: any }> = [];

    // Birthdays first
    dayBirthdays.forEach((b) => items.push({ type: "birthday", id: b.id, data: b }));

    // Todos
    dayTodos.forEach((t) => items.push({ type: "todo", id: t.id, data: t }));

    // Events (incomplete first, then completed)
    const incompleteEvents = dayEvents.filter((e) => !e.isCompleted);
    const completedEvents = dayEvents.filter((e) => e.isCompleted);
    incompleteEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));
    completedEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));

    // Ministries
    dayMinistries.forEach((m) => items.push({ type: "ministry", id: m.id, data: m }));

    // Expandable sections (worship, fasting, bible)
    items.push({ type: "expandable-worship", id: "worship-section", data: null });
    items.push({ type: "expandable-fasting", id: "fasting-section", data: activeFast });
    items.push({ type: "expandable-bible", id: "bible-section", data: currentBibleBook });

    return items;
  }, [dayBirthdays, dayTodos, dayEvents, dayMinistries, activeFast, currentBibleBook]);

  const renderItem = useCallback(
    ({ item }: { item: { type: string; id: string; data: any } }) => {
      switch (item.type) {
        case "birthday":
          return <BirthdayCard birthday={item.data} />;
        case "todo":
          return (
            <TodoItem
              todo={item.data}
              onToggle={() => setTodos((prev) => toggleTodoCompleted(prev, item.data.id))}
            />
          );
        case "event":
          return (
            <EventCard
              event={item.data}
              onToggle={() => setEvents((prev) => toggleEventCompleted(prev, item.data.id))}
            />
          );
        case "ministry":
          return (
            <MinistryCard
              ministry={item.data}
              onToggle={() => setMinistries((prev) => toggleMinistryCompleted(prev, item.data.id))}
            />
          );
        case "expandable-worship":
          return (
            <ExpandableSection title="Worship" icon="music-note">
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                Add worship time to your day. Tap + to schedule a worship session.
              </Text>
            </ExpandableSection>
          );
        case "expandable-fasting":
          return (
            <ExpandableSection title="Fasting" icon="restaurant">
              {item.data ? (
                <View>
                  <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                    {item.data.name}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    {item.data.type} Fast • Day {Math.max(1, Math.floor((new Date(selectedDate).getTime() - new Date(item.data.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1)} of {item.data.durationDays}
                  </Text>
                </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  No active fast. Start one from the Settings tab.
                </Text>
              )}
            </ExpandableSection>
          );
        case "expandable-bible":
          return (
            <ExpandableSection title="Bible Reading" icon="menu-book">
              <Text style={{ color: colors.foreground, fontSize: 14 }}>
                {item.data ? `Currently reading: ${item.data}` : "No book marked as current."}
              </Text>
            </ExpandableSection>
          );
        default:
          return null;
      }
    },
    [colors, selectedDate]
  );

  // Render the summary as a ListHeaderComponent
  const renderListHeader = useCallback(() => (
    <View>
      {/* Daily Summary Card - the user's favorite part */}
      <Animated.View
        style={[
          {
            opacity: summaryOpacity,
            transform: [{ translateY: summaryTranslateY }],
          },
        ]}
      >
        <DailySummaryCard
          remainingTodos={remainingTodos}
          remainingPrayers={remainingPrayers}
          fastingStatus={fastingStatus}
          budgetAmount={budgetAmount}
          peopleToReach={peopleToReach}
          currentBibleStudy={currentBibleStudy}
          personalTodos={personalTodos}
          onTodoComplete={onTodoComplete}
        />
      </Animated.View>
    </View>
  ), [remainingTodos, remainingPrayers, fastingStatus, budgetAmount, peopleToReach, currentBibleStudy, personalTodos, onTodoComplete, summaryOpacity, summaryTranslateY]);

  return (
    <View style={[scheduleStyles.container, { backgroundColor: colors.background }]}>
      {/* Day Header with Date Strip - stays visible, slides up as summary collapses */}
      <Animated.View
        style={[
          scheduleStyles.dayHeader,
          { backgroundColor: colors.background, opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <View style={scheduleStyles.dayHeaderContent}>
          <Text style={[scheduleStyles.dayName, { color: colors.foreground }]}>
            {dateHeader.dayName}
            <Text style={{ color: colors.error }}>•</Text>
          </Text>
          <View style={scheduleStyles.dateRight}>
            <Text style={[scheduleStyles.monthYear, { color: colors.muted }]}>
              {dateHeader.monthName} {dateHeader.dayNum}
            </Text>
            <Text style={[scheduleStyles.yearText, { color: colors.muted }]}>
              {dateHeader.year}
            </Text>
          </View>
        </View>

        {/* Date Strip */}
        <View style={scheduleStyles.dateStrip}>
          {weekDates.map((date) => {
            const isSelected = date === selectedDate;
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                onPress={() => setSelectedDate(date)}
                style={({ pressed }) => [
                  scheduleStyles.dateItem,
                  isSelected && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[scheduleStyles.dateNum, { color: isSelected ? colors.foreground : colors.muted }, isToday && !isSelected && { color: colors.primary }]}>
                  {getDayNumber(date)}
                </Text>
                <Text style={[scheduleStyles.dateDayName, { color: isSelected ? colors.foreground : colors.muted }, isToday && !isSelected && { color: colors.primary }]}>
                  {getShortDayName(date)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Swipeable content area */}
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={[{ flex: 1 }, swipeStyle]}>
          <Animated.FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={[scheduleStyles.listContent, { paddingTop: DAY_HEADER_HEIGHT + 16 }]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            ListEmptyComponent={
              <View style={scheduleStyles.emptyState}>
                <MaterialIcons name="event-note" size={48} color={colors.muted} />
                <Text style={[scheduleStyles.emptyText, { color: colors.muted }]}>
                  No items for this day
                </Text>
                <Text style={[scheduleStyles.emptySubtext, { color: colors.muted }]}>
                  Tap + to add an event, todo, or ministry
                </Text>
              </View>
            }
          />
        </ReAnimated.View>
      </GestureDetector>

      {/* + FAB Button */}
      <Pressable
        onPress={() => setShowAddModal(true)}
        style={({ pressed }) => [scheduleStyles.fab, { backgroundColor: colors.primary }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }]}
      >
        <MaterialIcons name="add" size={32} color="#FFFFFF" />
      </Pressable>

      {/* Add Modal - Type Selection */}
      <Modal transparent visible={showAddModal && !addType} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={scheduleStyles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <View style={[scheduleStyles.addTypeSheet, { backgroundColor: colors.surface }]}>
            <Text style={[scheduleStyles.addTypeTitle, { color: colors.foreground }]}>Add to Schedule</Text>
            <Pressable
              onPress={() => setAddType("ministry")}
              style={({ pressed }) => [scheduleStyles.addTypeOption, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.addTypeIcon, { backgroundColor: "#7C5CFF20" }]}>
                <MaterialIcons name="volunteer-activism" size={24} color="#7C5CFF" />
              </View>
              <View>
                <Text style={[scheduleStyles.addTypeLabel, { color: colors.foreground }]}>Ministry</Text>
                <Text style={[scheduleStyles.addTypeDesc, { color: colors.muted }]}>Service, outreach, or teaching</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setAddType("event")}
              style={({ pressed }) => [scheduleStyles.addTypeOption, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.addTypeIcon, { backgroundColor: "#3DAA7820" }]}>
                <MaterialIcons name="event" size={24} color="#3DAA78" />
              </View>
              <View>
                <Text style={[scheduleStyles.addTypeLabel, { color: colors.foreground }]}>Event</Text>
                <Text style={[scheduleStyles.addTypeDesc, { color: colors.muted }]}>Calendar event with time & place</Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setAddType("todo")}
              style={({ pressed }) => [scheduleStyles.addTypeOption, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.addTypeIcon, { backgroundColor: "#E3B34120" }]}>
                <MaterialIcons name="check-box" size={24} color="#E3B341" />
              </View>
              <View>
                <Text style={[scheduleStyles.addTypeLabel, { color: colors.foreground }]}>Todo</Text>
                <Text style={[scheduleStyles.addTypeDesc, { color: colors.muted }]}>Simple checkbox item</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Add Modal - Event Form */}
      <Modal transparent visible={addType === "event"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>New Event</Text>
              <Pressable onPress={handleSaveEvent} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TITLE</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g., Church Service, BBQ, Bible Study"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  {formTitle.trim() && detectEventKeyword(formTitle) && (
                    <View style={[scheduleStyles.keywordPreview, { backgroundColor: detectEventKeyword(formTitle)!.bgColor }]}>
                      <Text style={{ fontSize: 20 }}>{detectEventKeyword(formTitle)!.emoji}</Text>
                      <Text style={{ color: detectEventKeyword(formTitle)!.textColor, fontSize: 12, fontWeight: "600", marginLeft: 8 }}>
                        {detectEventKeyword(formTitle)!.label} card will be shown
                      </Text>
                    </View>
                  )}
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <TextInput
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder={selectedDate}
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <TextInput
                        value={formStartTime}
                        onChangeText={setFormStartTime}
                        placeholder="e.g., 9:00 AM"
                        placeholderTextColor={colors.muted}
                        style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                        returnKeyType="done"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <TextInput
                        value={formEndTime}
                        onChangeText={setFormEndTime}
                        placeholder="e.g., 10:00 AM"
                        placeholderTextColor={colors.muted}
                        style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LOCATION</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="Optional"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border, minHeight: 80 }]}
                    multiline
                    returnKeyType="done"
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Add Modal - Todo Form */}
      <Modal transparent visible={addType === "todo"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>New Todo</Text>
              <Pressable onPress={handleSaveTodo} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <View style={scheduleStyles.formContent}>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>WHAT DO YOU NEED TO DO?</Text>
              <TextInput
                value={formTitle}
                onChangeText={setFormTitle}
                placeholder="e.g., Buy groceries, Call pastor"
                placeholderTextColor={colors.muted}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
                onSubmitEditing={handleSaveTodo}
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE (optional)</Text>
              <TextInput
                value={formDate}
                onChangeText={setFormDate}
                placeholder={selectedDate}
                placeholderTextColor={colors.muted}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Modal - Ministry Form */}
      <Modal transparent visible={addType === "ministry"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>New Ministry</Text>
              <Pressable onPress={handleSaveMinistry} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>MINISTRY NAME</Text>
                  <TextInput
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g., Youth Group, Prayer Meeting"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TYPE OF MINISTRY</Text>
                  <View style={scheduleStyles.ministryTypePills}>
                    {MINISTRY_TYPES.map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setFormMinistryType(type)}
                        style={({ pressed }) => [
                          scheduleStyles.ministryPill,
                          { borderColor: colors.border },
                          formMinistryType === type && { backgroundColor: colors.primary, borderColor: colors.primary },
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={[scheduleStyles.ministryPillText, { color: colors.foreground }, formMinistryType === type && { color: "#FFFFFF" }]}>
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <TextInput
                    value={formDate}
                    onChangeText={setFormDate}
                    placeholder={selectedDate}
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DUE DATE / DURATION</Text>
                  <TextInput
                    value={formDueDate}
                    onChangeText={setFormDueDate}
                    placeholder="YYYY-MM-DD (optional)"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <TextInput
                        value={formStartTime}
                        onChangeText={setFormStartTime}
                        placeholder="e.g., 6:00 PM"
                        placeholderTextColor={colors.muted}
                        style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                        returnKeyType="done"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <TextInput
                        value={formEndTime}
                        onChangeText={setFormEndTime}
                        placeholder="e.g., 8:00 PM"
                        placeholderTextColor={colors.muted}
                        style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                        returnKeyType="done"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LOCATION</Text>
                  <TextInput
                    value={formLocation}
                    onChangeText={setFormLocation}
                    placeholder="e.g., Main Campus, Room 201"
                    placeholderTextColor={colors.muted}
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dayHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  dayName: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 52,
  },
  dateRight: {
    alignItems: "flex-end",
    paddingTop: 8,
  },
  monthYear: {
    fontSize: 15,
    fontWeight: "500",
  },
  yearText: {
    fontSize: 15,
    fontWeight: "500",
  },
  dateStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  dateItem: {
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  dateNum: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
  dateDayName: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 13,
  },
  fab: {
    position: "absolute",
    right: 15,
    bottom: 60,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  addTypeSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  addTypeTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  addTypeOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  addTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addTypeLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  addTypeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  formOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
  },
  formSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    paddingBottom: 40,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E6DCF8",
  },
  formTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  formSave: {
    fontSize: 16,
    fontWeight: "700",
  },
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 16,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  formRow: {
    flexDirection: "row",
  },
  keywordPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  ministryTypePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ministryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  ministryPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
});

const eventStyles = StyleSheet.create({
  illustratedCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 80,
  },
  illustratedContent: {
    flex: 1,
  },
  illustratedTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  illustratedTime: {
    fontSize: 13,
    marginTop: 4,
  },
  illustratedLocation: {
    fontSize: 12,
    marginTop: 2,
  },
  illustratedEmoji: {
    fontSize: 36,
    marginLeft: 12,
  },
  completedCard: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  completedTime: {
    fontSize: 11,
    marginLeft: 8,
  },
  defaultCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  defaultDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  defaultTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  defaultTime: {
    fontSize: 12,
    marginTop: 2,
  },
});

const todoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E6DCF830",
  },
  title: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
});

const ministryStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    position: "relative",
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  location: {
    fontSize: 12,
    marginTop: 4,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },
});

const birthdayStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#FFC10730",
  },
  emoji: {
    fontSize: 22,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: "#F57F17",
  },
});

const expandStyles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
});
