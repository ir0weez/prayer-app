import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
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
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/use-colors";
import { FlameSparkIcon } from "./flame-spark-icon";
import { DateTimePicker } from "./date-time-picker";
import { ScheduleProgressBar } from "./schedule-progress-bar";
import { TimeBlockCard } from "./time-block-card";
import { TimeBlockIndicator } from "./time-block-indicator";
import { AvatarPeopleSelector } from "./avatar-people-selector";
import { StackedAvatar } from "./stacked-avatar";
import { calculateAvailableTimeBlocks, filterExpiredTimeBlocks } from "@/lib/time-blocks";
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
  SCHEDULE_BIBLE_STUDIES_KEY,
  BibleStudySession,
  createBibleStudySession,
  getBibleStudiesForDate,
  toggleBibleStudyCompleted,
  ScheduleEvent,
  ScheduleMinistry,
  ScheduleTodo,
  toggleEventCompleted,
  toggleMinistryCompleted,
  toggleTodoCompleted,
} from "@/lib/schedule-data";
import { getTodayISOString, type Person, getIconForTodo } from "@/lib/prayercircle-data";
import { getActiveFast, type PersonalFast } from "@/lib/prayercircle-fasting";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { BIBLE_BOOKS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, UnifiedBibleState } from "@/lib/bible-unified";
import { syncUnifiedBibleToAllOldSystems } from "@/lib/bible-sync";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_HEADER_HEIGHT = 160; // Height of summary card

function iconName(name: string) {
  return name as keyof typeof MaterialIcons.glyphMap;
}

// ─── Event Card Component ────────────────────────────────────────────────────
function EventCard({
  event,
  onToggle,
  onEdit,
  onDelete,
  people = [],
}: {
  event: ScheduleEvent;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
}) {
  const colors = useColors();
  const keyword = event.keyword ? EVENT_KEYWORD_MAP.find((k) => k.label === event.keyword) : detectEventKeyword(event.title);
  const cardScale = useSharedValue(1);
  const swipeX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      swipeX.value = Math.max(-80, Math.min(80, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < -50 && onDelete) {
        runOnJS(onDelete)();
      } else if (e.translationX > 50 && onEdit) {
        runOnJS(onEdit)();
      }
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateX: swipeX.value }],
  }));

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const linkedPeople = useMemo(() => {
    if (!event.linkedPeopleIds || event.linkedPeopleIds.length === 0) return [];
    return event.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [event.linkedPeopleIds, people]);

  if (event.isCompleted) {
    // Completed: solid color box, smaller
    const completedColor = keyword?.accentColor || colors.muted;
    return (
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={swipeStyle}>
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
        </ReAnimated.View>
      </GestureDetector>
    );
  }

  // Active: illustrated card with full-bleed image if available
  if (keyword && keyword.imageUrl) {
    return (
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={swipeStyle}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle();
            }}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <View style={[eventStyles.fullBleedCard, { borderColor: keyword.accentColor + "40", backgroundColor: event.color }]}>
              {/* Full-bleed background image */}
              <Image source={{ uri: keyword.imageUrl }} style={eventStyles.fullBleedImage} />
              {/* Content overlay with gradient */}
              <View style={eventStyles.fullBleedOverlay}>
                <View style={eventStyles.fullBleedContent}>
                  <Text style={[eventStyles.fullBleedTitle, { color: '#FFFFFF' }]}>{event.title}</Text>
                  {event.startTime && (
                    <Text style={[eventStyles.fullBleedTime, { color: '#FFFFFFDD' }]}>
                      {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                    </Text>
                  )}
                  {event.location && (
                    <Text style={[eventStyles.fullBleedLocation, { color: '#FFFFFFBB' }]} numberOfLines={1}>
                      📍 {event.location}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </Pressable>
        </ReAnimated.View>
      </GestureDetector>
    );
  }

  // Active: illustrated card if keyword matches (fallback without image)
  if (keyword) {
    return (
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={swipeStyle}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle();
            }}
            style={({ pressed }) => [pressed && { opacity: 0.85 }]}
          >
            <View style={[eventStyles.illustratedCard, { backgroundColor: event.color || keyword.bgColor, borderColor: keyword.accentColor + "40" }]}>
              <View style={eventStyles.illustratedContent}>
                <Text style={[eventStyles.illustratedTitle, { color: '#FFFFFF' }]}>{event.title}</Text>
                {event.startTime && (
                  <Text style={[eventStyles.illustratedTime, { color: '#FFFFFFDD' }]}>
                    {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                  </Text>
                )}
                {event.location && (
                  <Text style={[eventStyles.illustratedLocation, { color: '#FFFFFFBB' }]} numberOfLines={1}>
                    📍 {event.location}
                  </Text>
                )}
              </View>
              <Text style={eventStyles.illustratedEmoji}>{keyword.emoji}</Text>
            </View>
          </Pressable>
        </ReAnimated.View>
      </GestureDetector>
    );
  }

  // Default event card (no keyword match)
  return (
    <GestureDetector gesture={panGesture}>
      <ReAnimated.View style={swipeStyle}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          style={({ pressed }) => [pressed && { opacity: 0.85 }]}
        >
          <View style={[eventStyles.defaultCard, { backgroundColor: event.color || colors.surface, borderColor: colors.border }]}>
            <View style={[eventStyles.defaultDot, { backgroundColor: event.color || colors.primary }]} />
            <View style={{ flex: 1 }}>
              <Text style={[eventStyles.defaultTitle, { color: event.color ? '#FFFFFF' : colors.foreground }]}>{event.title}</Text>
              {event.startTime && (
                <Text style={[eventStyles.defaultTime, { color: event.color ? '#FFFFFFDD' : colors.muted }]}>
                  {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                </Text>
              )}
            </View>
            {linkedPeople.length > 0 && (
              <View style={{ marginLeft: 8 }}>
                <StackedAvatar people={linkedPeople} size={20} />
              </View>
            )}
          </View>
        </Pressable>
      </ReAnimated.View>
    </GestureDetector>
  );
}

// ─── Todo Item Component ─────────────────────────────────────────────────────
function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  people = [],
}: {
  todo: ScheduleTodo;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
}) {
  const colors = useColors();
  const iconNameStr = getIconForTodo(todo.title);
  const swipeX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      swipeX.value = Math.max(-80, Math.min(80, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < -50 && onDelete) {
        runOnJS(onDelete)();
      } else if (e.translationX > 50 && onEdit) {
        runOnJS(onEdit)();
      }
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const linkedPeople = useMemo(() => {
    if (!todo.linkedPeopleIds || todo.linkedPeopleIds.length === 0) return [];
    return todo.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [todo.linkedPeopleIds, people]);

  return (
    <GestureDetector gesture={panGesture}>
      <ReAnimated.View style={swipeStyle}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          style={({ pressed }) => [todoStyles.row, pressed && { opacity: 0.7 }]}
        >
          <View style={[todoStyles.iconContainer, { backgroundColor: todo.isCompleted ? colors.success : (todo.color || colors.primary) }]}>
            <MaterialIcons
              name={todo.isCompleted ? "check" : (iconNameStr as any)}
              size={16}
              color="#FFFFFF"
            />
          </View>
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
          {linkedPeople.length > 0 && (
            <StackedAvatar people={linkedPeople} size={24} />
          )}
        </Pressable>
      </ReAnimated.View>
    </GestureDetector>
  );
}

// ─── Ministry Card Component ─────────────────────────────────────────────────
function MinistryCard({
  ministry,
  onToggle,
  onEdit,
  onDelete,
  people = [],
}: {
  ministry: ScheduleMinistry;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
}) {
  const colors = useColors();
  const cardScale = useSharedValue(1);
  const swipeX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.4, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withTiming(1.15, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      swipeX.value = Math.max(-80, Math.min(80, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < -50 && onDelete) {
        runOnJS(onDelete)();
      } else if (e.translationX > 50 && onEdit) {
        runOnJS(onEdit)();
      }
      swipeX.value = withTiming(0, { duration: 200 });
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }, { translateX: swipeX.value }],
  }));

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const linkedPeople = useMemo(() => {
    if (!ministry.linkedPeopleIds || ministry.linkedPeopleIds.length === 0) return [];
    return ministry.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [ministry.linkedPeopleIds, people]);

  return (
    <GestureDetector gesture={panGesture}>
      <ReAnimated.View style={swipeStyle}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <ReAnimated.View style={[animatedCardStyle]}>
            {/* Pulsing glow background */}
            <ReAnimated.View
              style={[
                {
                  position: "absolute",
                  top: -8,
                  left: -8,
                  right: -8,
                  bottom: -8,
                  borderRadius: 18,
                  backgroundColor: ministry.color || "#7C5CFF",
                  zIndex: -1,
                },
                glowAnimatedStyle,
              ]}
            />
            <View style={[ministryStyles.card, { backgroundColor: colors.surface, borderColor: ministry.color || "#7C5CFF", borderWidth: 2 }]}>
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
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                {ministry.startTime && (
                  <Text style={[ministryStyles.time, { color: colors.muted }]}>
                    {ministry.startTime}{ministry.endTime ? ` – ${ministry.endTime}` : ""}
                  </Text>
                )}
                {linkedPeople.length > 0 && (
                  <View style={{ marginLeft: 8 }}>
                    <StackedAvatar people={linkedPeople} size={20} />
                  </View>
                )}
              </View>
              {ministry.isCompleted && (
                <View style={ministryStyles.checkBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#22C55E" />
                </View>
              )}
            </View>
          </ReAnimated.View>
        </Pressable>
      </ReAnimated.View>
    </GestureDetector>
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
}: {
  people: Person[];
  fasts: PersonalFast[];
  remainingTodos?: number;
  remainingPrayers?: number;
  fastingStatus?: string;
  budgetAmount?: number;
  peopleToReach?: number;
  currentBibleStudy?: string;
  personalTodos?: any[];
  onTodoComplete?: (todoId: string) => void;
}) {
  const colors = useColors();
  const today = getTodayISOString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [ministries, setMinistries] = useState<ScheduleMinistry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"event" | "todo" | "ministry" | "bible-study" | null>(null);
  const [editingMinistry, setEditingMinistry] = useState<ScheduleMinistry | null>(null);
  const [showMinistryForm, setShowMinistryForm] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formMinistryType, setFormMinistryType] = useState("Outreach");
  const [formDueDate, setFormDueDate] = useState("");
  const [formBibleBook, setFormBibleBook] = useState("Genesis");
  const [formBibleChapter, setFormBibleChapter] = useState("1");
  const [formColor, setFormColor] = useState("#6B7280"); // Default gray
  const [formLinkedPeopleIds, setFormLinkedPeopleIds] = useState<string[]>([]); // People linked to current item
  const [bibleStudies, setBibleStudies] = useState<BibleStudySession[]>([]);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any>(null);
  const [showTimeBlockColorPicker, setShowTimeBlockColorPicker] = useState(false);
  const [timeBlockColors, setTimeBlockColors] = useState<Record<string, string>>({}); // Map of time block ID to color

  // Color palette for todos, events, and ministries
  const COLOR_PALETTE = [
    { name: "Gray", hex: "#6B7280" },
    { name: "Red", hex: "#EF4444" },
    { name: "Orange", hex: "#F97316" },
    { name: "Yellow", hex: "#FBBF24" },
    { name: "Blue", hex: "#3B82F6" },
    { name: "Purple", hex: "#A855F7" },
  ];

  // Memoize summary data to ensure it updates when props change
  const memoizedSummaryData = useMemo(() => ({
    remainingTodos,
    remainingPrayers,
    fastingStatus,
    budgetAmount,
    peopleToReach,
    currentBibleStudy,
    personalTodos,
    onTodoComplete,
  }), [remainingTodos, remainingPrayers, fastingStatus, budgetAmount, peopleToReach, currentBibleStudy, personalTodos, onTodoComplete]);

  // Scroll animation
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, DAY_HEADER_HEIGHT / 2],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, DAY_HEADER_HEIGHT],
    outputRange: [0, -DAY_HEADER_HEIGHT],
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

  // Profile data from AsyncStorage - use canonical PROFILE_STORAGE_KEY
  const [userName, setUserName] = useState("Friend");
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | undefined>(undefined);
  
  const loadProfileData = useCallback(() => {
    AsyncStorage.getItem(PROFILE_STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const profile = JSON.parse(data);
          if (profile.name) setUserName(profile.name);
          if (profile.photoUri) setUserProfilePhoto(profile.photoUri);
        } catch (e) {
          // Silent fail
        }
      }
    }).catch(() => undefined);
  }, []);
  
  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);
  
  // Reload profile when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

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
    setFormColor("#6366F1"); // Reset to default indigo
    setFormLinkedPeopleIds([]);
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
      color: formColor,
    });
    if (formLinkedPeopleIds.length > 0) {
      newEvent.linkedPeopleIds = formLinkedPeopleIds;
    }
    setEvents((prev) => [...prev, newEvent]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveTodo = () => {
    if (!formTitle.trim()) return;
    const newTodo = createScheduleTodo(
      { title: formTitle.trim(), date: formDate || selectedDate, startTime: formStartTime || undefined, color: formColor },
      todos.filter((t) => t.date === (formDate || selectedDate)).length
    );
    if (formLinkedPeopleIds.length > 0) {
      newTodo.linkedPeopleIds = formLinkedPeopleIds;
    }
    setTodos((prev) => {
      const updated = [...prev, newTodo];
      // Auto-sort todos by time for the selected date
      return updated.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const aTime = a.startTime || "23:59";
        const bTime = b.startTime || "23:59";
        return aTime.localeCompare(bTime);
      });
    });
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
      color: formColor,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      location: formLocation || undefined,
      notes: formNotes || undefined,
    });
    if (formLinkedPeopleIds.length > 0) {
      newMinistry.linkedPeopleIds = formLinkedPeopleIds;
    }
    setMinistries((prev) => [...prev, newMinistry]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleSaveBibleStudy = async () => {
    if (!formBibleBook || !formBibleChapter) return;
    const newStudy = createBibleStudySession({
      book: formBibleBook,
      chapter: parseInt(formBibleChapter, 10),
      date: formDate || selectedDate,
      startTime: formStartTime || undefined,
      endTime: formEndTime || undefined,
      notes: formNotes || undefined,
    });
    setBibleStudies((prev) => [...prev, newStudy]);
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  // Build flat list data
  const listData = useMemo(() => {
    const items: Array<{ type: string; id: string; data: any; sortTime?: string }> = [];

    // Birthdays first
    dayBirthdays.forEach((b) => items.push({ type: "birthday", id: b.id, data: b }));

    // Combine todos, events, and ministries with time info for chronological sorting
    const timedItems: Array<{ type: string; id: string; data: any; sortTime: string }> = [];

    // Add todos with time (only if there are any)
    if (dayTodos.length > 0) {
      dayTodos.forEach((t) => {
        timedItems.push({
          type: "todo",
          id: t.id,
          data: t,
          sortTime: t.startTime || "23:59",
        });
      });
    }

    // Add incomplete events with time (only if there are any)
    const incompleteEvents = dayEvents.filter((e) => !e.isCompleted);
    if (incompleteEvents.length > 0) {
      incompleteEvents.forEach((e) => {
        timedItems.push({
          type: "event",
          id: e.id,
          data: e,
          sortTime: e.startTime || "23:59",
        });
      });
    }

    // Add ministries with time (only if there are any)
    if (dayMinistries.length > 0) {
      dayMinistries.forEach((m) => {
        timedItems.push({
          type: "ministry",
          id: m.id,
          data: m,
          sortTime: m.startTime || "23:59",
        });
      });
    }

    // Calculate available time blocks
    const allScheduledItems = [
      ...dayTodos.filter((t) => t.startTime),
      ...dayEvents.filter((e) => !e.isCompleted && e.startTime),
      ...dayMinistries.filter((m) => m.startTime),
    ];
    const availableBlocks = calculateAvailableTimeBlocks(allScheduledItems);
    const activeBlocks = filterExpiredTimeBlocks(availableBlocks);

    // Merge time blocks with timed items for chronological intertwining
    const allTimedItems = [
      ...timedItems,
      ...activeBlocks.map((block) => ({
        type: "time-block",
        id: block.id,
        data: { block },
        sortTime: block.startTime,
      })),
    ];

    // Sort all items chronologically
    allTimedItems.sort((a, b) => a.sortTime.localeCompare(b.sortTime));

    // Add sorted items
    allTimedItems.forEach((item) => items.push(item));

    // Add completed events at the end
    const completedEvents = dayEvents.filter((e) => e.isCompleted);
    completedEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));

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
              people={people}
              onToggle={() => setTodos((prev) => toggleTodoCompleted(prev, item.data.id))}
              onEdit={() => {
                setFormTitle(item.data.title);
                setFormDate(item.data.date);
                setFormStartTime(item.data.startTime || "");
                setAddType("todo");
                setShowAddModal(true);
              }}
              onDelete={() => {
                setTodos((prev) => prev.filter(t => t.id !== item.data.id));
              }}
            />
          );
        case "event":
          return (
            <EventCard
              event={item.data}
              people={people}
              onToggle={() => setEvents((prev) => toggleEventCompleted(prev, item.data.id))}
              onEdit={() => {
                setFormTitle(item.data.title);
                setFormDate(item.data.date);
                setFormStartTime(item.data.startTime || "");
                setAddType("event");
                setShowAddModal(true);
              }}
              onDelete={() => {
                setEvents((prev) => prev.filter(e => e.id !== item.data.id));
              }}
            />
          );
        case "ministry":
          return (
            <MinistryCard
              ministry={item.data}
              people={people}
              onToggle={() => setMinistries((prev) => toggleMinistryCompleted(prev, item.data.id))}
              onEdit={() => {
                setEditingMinistry(item.data);
                setShowMinistryForm(true);
              }}
              onDelete={() => {
                setMinistries((prev) => prev.filter((m) => m.id !== item.data.id));
              }}
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
        case "time-block":
          return (
            <Pressable
              onPress={() => {
                // Show color picker modal
                setEditingTimeBlock(item.data.block);
                setShowTimeBlockColorPicker(true);
              }}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
            >
              <TimeBlockIndicator block={item.data.block} customColor={timeBlockColors[item.data.block.id]} />
            </Pressable>
          );
        default:
          return null;
      }
    },
    [colors, selectedDate, people]
  );

  return (
    <View style={[scheduleStyles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Schedule Title */}
      <View style={[scheduleStyles.scheduleTitle, { borderBottomColor: colors.border }]}>
        <Text style={[scheduleStyles.scheduleTitleText, { color: colors.foreground }]}>Schedule</Text>
      </View>



      {/* Swipeable content area */}
      <GestureDetector gesture={panGesture}>
        <ReAnimated.View style={[{ flex: 1 }, swipeStyle]}>
          <Animated.FlatList
            data={listData}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={[selectedDate, listData, colors]}
            contentContainerStyle={[scheduleStyles.listContent, { paddingTop: 0, backgroundColor: colors.surface }]}
            showsVerticalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: true }
            )}
            scrollEventThrottle={16}
            ListHeaderComponent={
              <>
                {/* Summary Card - Sticky Header Index 0 */}
                <View style={[scheduleStyles.summaryContainer, { backgroundColor: colors.background }]}>
                  <DailySummaryCard
                    remainingTodos={getTodosForDate(todos, selectedDate).filter(t => !t.isCompleted).length}
                    remainingPrayers={memoizedSummaryData.remainingPrayers}
                    fastingStatus={memoizedSummaryData.fastingStatus}
                    budgetAmount={memoizedSummaryData.budgetAmount}
                    peopleToReach={memoizedSummaryData.peopleToReach}
                    currentBibleStudy={memoizedSummaryData.currentBibleStudy}
                    personalTodos={memoizedSummaryData.personalTodos}
                    onTodoComplete={memoizedSummaryData.onTodoComplete || onTodoComplete}
                    onAvatarPress={(todo) => {
                      setFormTitle(todo.title);
                      setFormDate(selectedDate);
                      setFormStartTime(todo.dueTime || "");
                      setAddType("todo");
                      setShowAddModal(true);
                    }}
                    eventCount={getEventsForDate(events, selectedDate).filter(e => !e.isCompleted).length}
                    ministryCount={getMinistriesForDate(ministries, selectedDate).filter(m => !m.isCompleted).length}
                    userName={userName}
                    userProfilePhoto={userProfilePhoto}
                  />
                  
                  {/* Progress Bar */}
                  <ScheduleProgressBar
                    completed={getTodosForDate(todos, selectedDate).filter(t => t.isCompleted).length + getEventsForDate(events, selectedDate).filter(e => e.isCompleted).length}
                    total={getTodosForDate(todos, selectedDate).length + getEventsForDate(events, selectedDate).length}
                    label="Tasks & Events"
                  />
                </View>


                {/* Date Header Card - Sticky Header Index 1, scrolls over summary */}
                <View style={[scheduleStyles.dateHeaderCard, { backgroundColor: colors.surface }]}>
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
                </View>

              </>
            }
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
            <Pressable
              onPress={() => setAddType("bible-study")}
              style={({ pressed }) => [scheduleStyles.addTypeOption, { borderColor: colors.border }, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.addTypeIcon, { backgroundColor: "#FF6B6B20" }]}>
                <MaterialIcons name="menu-book" size={24} color="#FF6B6B" />
              </View>
              <View>
                <Text style={[scheduleStyles.addTypeLabel, { color: colors.foreground }]}>Bible Study</Text>
                <Text style={[scheduleStyles.addTypeDesc, { color: colors.muted }]}>Schedule Bible chapter reading</Text>
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
                    <View style={[scheduleStyles.keywordPrefix, { backgroundColor: detectEventKeyword(formTitle)!.bgColor }]}>
                      <Text style={{ fontSize: 20 }}>{detectEventKeyword(formTitle)!.emoji}</Text>
                      <Text style={{ color: detectEventKeyword(formTitle)!.textColor, fontSize: 12, fontWeight: "600", marginLeft: 8 }}>
                        {detectEventKeyword(formTitle)!.label} card will be shown
                      </Text>
                    </View>
                  )}
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={setFormStartTime}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
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
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {COLOR_PALETTE.map((color) => (
                      <Pressable
                        key={color.hex}
                        onPress={() => setFormColor(color.hex)}
                        style={({ pressed }) => [{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: color.hex,
                          borderWidth: formColor === color.hex ? 3 : 0,
                          borderColor: colors.foreground,
                          opacity: pressed ? 0.8 : 1,
                        }]}
                      />
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK PEOPLE (optional)</Text>
                  <AvatarPeopleSelector
                    people={people}
                    selectedIds={formLinkedPeopleIds}
                    onToggle={(personId) => {
                      setFormLinkedPeopleIds((prev) =>
                        prev.includes(personId)
                          ? prev.filter((id) => id !== personId)
                          : [...prev, personId]
                      );
                    }}
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
              <DateTimePicker
                value={formDate || selectedDate}
                onChange={setFormDate}
                mode="date"
                label="Select Date"
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TIME (optional)</Text>
              <DateTimePicker
                value={formStartTime}
                onChange={setFormStartTime}
                mode="time"
                label="Select Time"
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {COLOR_PALETTE.map((color) => (
                  <Pressable
                    key={color.hex}
                    onPress={() => setFormColor(color.hex)}
                    style={({ pressed }) => [{
                      width: 50,
                      height: 50,
                      borderRadius: 25,
                      backgroundColor: color.hex,
                      borderWidth: formColor === color.hex ? 3 : 0,
                      borderColor: colors.foreground,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  />
                ))}
              </View>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK PEOPLE (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {people.map((person) => (
                  <Pressable
                    key={person.id}
                    onPress={() => {
                      setFormLinkedPeopleIds((prev) =>
                        prev.includes(person.id)
                          ? prev.filter((id) => id !== person.id)
                          : [...prev, person.id]
                      );
                    }}
                    style={({ pressed }) => [{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: formLinkedPeopleIds.includes(person.id) ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  >
                    <Text style={[{
                      color: formLinkedPeopleIds.includes(person.id) ? '#fff' : colors.foreground,
                      fontSize: 12,
                      fontWeight: '500',
                    }]}>
                      {person.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
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
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DUE DATE / DURATION</Text>
                  <DateTimePicker
                    value={formDueDate}
                    onChange={setFormDueDate}
                    mode="date"
                    label="Select Due Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={setFormStartTime}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
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
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>COLOR</Text>
                  <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    {COLOR_PALETTE.map((color) => (
                      <Pressable
                        key={color.hex}
                        onPress={() => setFormColor(color.hex)}
                        style={({ pressed }) => [{
                          width: 50,
                          height: 50,
                          borderRadius: 25,
                          backgroundColor: color.hex,
                          borderWidth: formColor === color.hex ? 3 : 0,
                          borderColor: colors.foreground,
                          opacity: pressed ? 0.8 : 1,
                        }]}
                      />
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK PEOPLE (optional)</Text>
                  <AvatarPeopleSelector
                    people={people}
                    selectedIds={formLinkedPeopleIds}
                    onToggle={(personId) => {
                      setFormLinkedPeopleIds((prev) =>
                        prev.includes(personId)
                          ? prev.filter((id) => id !== personId)
                          : [...prev, personId]
                      );
                    }}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Add Modal - Bible Study Form */}
      <Modal transparent visible={addType === "bible-study"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>Bible Study</Text>
              <Pressable onPress={handleSaveBibleStudy} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
            <FlatList
              data={[{ key: "form" }]}
              keyExtractor={(item) => item.key}
              renderItem={() => (
                <View style={scheduleStyles.formContent}>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>BOOK OF THE BIBLE</Text>
                  <View style={scheduleStyles.bibleBookPicker}>
                    {BIBLE_BOOKS.slice(0, 12).map((book) => (
                      <Pressable
                        key={book}
                        onPress={() => setFormBibleBook(book)}
                        style={({ pressed }) => [scheduleStyles.bibleBookButton, { borderColor: colors.border }, formBibleBook === book && { backgroundColor: colors.primary, borderColor: colors.primary }, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={[scheduleStyles.bibleBookButtonText, { color: colors.foreground }, formBibleBook === book && { color: "#FFFFFF" }]}>{book}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>CHAPTER</Text>
                  <TextInput
                    value={formBibleChapter}
                    onChangeText={setFormBibleChapter}
                    placeholder="1"
                    placeholderTextColor={colors.muted}
                    keyboardType="number-pad"
                    style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                    returnKeyType="done"
                  />
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
                  <DateTimePicker
                    value={formDate || selectedDate}
                    onChange={setFormDate}
                    mode="date"
                    label="Select Date"
                  />
                  <View style={scheduleStyles.formRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>START TIME</Text>
                      <DateTimePicker
                        value={formStartTime}
                        onChange={setFormStartTime}
                        mode="time"
                        label="Start Time"
                      />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>END TIME</Text>
                      <DateTimePicker
                        value={formEndTime}
                        onChange={setFormEndTime}
                        mode="time"
                        label="End Time"
                      />
                    </View>
                  </View>
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES</Text>
                  <TextInput
                    value={formNotes}
                    onChangeText={setFormNotes}
                    placeholder="e.g., Focus on verses 1-10"
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

      {/* Time Block Color Picker Modal */}
      <Modal transparent visible={showTimeBlockColorPicker} animationType="fade" onRequestClose={() => setShowTimeBlockColorPicker(false)}>
        <Pressable style={scheduleStyles.modalOverlay} onPress={() => setShowTimeBlockColorPicker(false)}>
          <View style={[scheduleStyles.addTypeSheet, { backgroundColor: colors.surface }]}>
            <Text style={[scheduleStyles.addTypeTitle, { color: colors.foreground }]}>Choose Color for Time Block</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 16, marginBottom: 20 }}>
              {COLOR_PALETTE.map((color) => (
                <Pressable
                  key={color.hex}
                  onPress={() => {
                    if (editingTimeBlock) {
                      setTimeBlockColors((prev) => ({
                        ...prev,
                        [editingTimeBlock.id]: color.hex,
                      }));
                    }
                    setShowTimeBlockColorPicker(false);
                  }}
                  style={({ pressed }) => [{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: color.hex,
                    borderWidth: timeBlockColors[editingTimeBlock?.id] === color.hex ? 3 : 0,
                    borderColor: colors.primary,
                    opacity: pressed ? 0.8 : 1,
                  }]}
                />
              ))}
            </View>
            <Pressable
              onPress={() => {
                if (editingTimeBlock) {
                  // Delete the time block by removing it from the schedule
                  // For now, just close the modal
                }
                setShowTimeBlockColorPicker(false);
              }}
              style={({ pressed }) => [scheduleStyles.addTypeOption, { borderColor: colors.error }, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.addTypeIcon, { backgroundColor: colors.error + "20" }]}>
                <MaterialIcons name="delete" size={24} color={colors.error} />
              </View>
              <Text style={[scheduleStyles.addTypeLabel, { color: colors.error }]}>Delete Time Block</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const scheduleStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scheduleTitle: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  scheduleTitleText: {
    fontSize: 28,
    fontWeight: '700',
  },
  summaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  dateHeaderCard: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomWidth: 0,
  },
  dayHeaderCardOverlay: {
    position: 'absolute',
    top: 0, // Start at summary position, will translate up via animation
    left: 0,
    right: 0,
    zIndex: 20,
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
    paddingHorizontal: 0,
    paddingBottom: 120,
    paddingTop: 0,
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
    right: 20,
    bottom: 60,
    width: 56,
    height: 56,
    borderRadius: 28,
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
  keywordPrefix: {
    marginTop: 8,
  },
  todoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 1,
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
  bibleBookPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  bibleBookButton: {
    flex: 0.3,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bibleBookButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

const eventStyles = StyleSheet.create({
  illustratedCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
    marginHorizontal: 16,
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
  fullBleedCard: {
    borderRadius: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 120,
    position: 'relative',
  },
  fullBleedImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  fullBleedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  fullBleedContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  fullBleedTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  fullBleedTime: {
    fontSize: 13,
    marginBottom: 2,
  },
  fullBleedLocation: {
    fontSize: 12,
  },
});

const todoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E6DCF830",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
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
