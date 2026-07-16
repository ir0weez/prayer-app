import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
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
import { createTRPCClient } from "@/lib/trpc";
import { FlameSparkIcon } from "./flame-spark-icon";
import { DateTimePicker } from "./date-time-picker";
import { ScheduleProgressBar } from "./schedule-progress-bar";
import { TimeBlockCard } from "./time-block-card";
import { TimeBlockIndicator } from "./time-block-indicator";
import { NowIndicator } from "./now-indicator";
import { AvatarPeopleSelector } from "./avatar-people-selector";
import { StackedAvatar } from "./stacked-avatar";
import { ContextMenu, type ContextMenuAction } from "./context-menu";
import { EventDetailCard } from "./event-detail-card";
import { MinistryDetailCard } from "./ministry-detail-card";
import { WorshipAlbumSelector, type WorshipAlbum } from "./worship-album-selector";
import { VinylRecord } from "./vinyl-record";
import { calculateAvailableTimeBlocks, filterExpiredTimeBlocks, timeToMinutes, minutesToTime } from "@/lib/time-blocks";
import { calculateRemainingTime } from "@/lib/remaining-time";
import { parseSpotifyUrl, fetchSpotifyAlbum } from "@/lib/spotify-api";
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
  getOverdueTodos,
  getShortDayName,
  getTodosForDate,
  getWeekDates,
  MINISTRY_TYPES,
  getMinistryTypeIcon,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  SCHEDULE_BIBLE_STUDIES_KEY,
  BibleStudySession,
  WorshipListLink,
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
import { getTodayISOString, type Person, getIconForTodo, getAllActiveEmergencyPrayers, type PrayerItem } from "@/lib/prayercircle-data";
import { WeeklyCalendarView } from "./weekly-calendar-view";
import { getWeekStart, formatDateISO, formatDateLocal } from "@/lib/date-utils";
import { MonthlyCalendarView } from "./monthly-calendar-view";
import { format12HourTime, normalizeTimeFormat } from "@/lib/utils";
import { getActiveFast, type PersonalFast } from "@/lib/prayercircle-fasting";
import { createWorshipList, WORSHIP_LISTS_KEY, addSongToList } from "@/lib/worship-list";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { SpotifySongCard } from "@/components/spotify-song-card";
import { EmergencyPrayersDisplay } from "@/components/emergency-prayers-display";
import { BIBLE_BOOKS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, UnifiedBibleState, UNIFIED_BIBLE_KEY, getNextUnreadChapter, getCurrentBook, getBookProgress, calculateReadingStreak, toggleChapterBookmark, markChapterAsUnread } from "@/lib/bible-unified";
import { syncUnifiedBibleToAllOldSystems } from "@/lib/bible-sync"; // Sync Bible state to legacy storage systems

const LEGACY_BIBLE_BOOK_STATUS_KEY = 'bibleBookStatus'; // Legacy storage key for book statuses

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
  onEdit?: (updatedEvent?: ScheduleEvent) => void;
  onDelete?: () => void;
  people?: Person[];
}) {
  const colors = useColors();
  const keyword = event.keyword ? EVENT_KEYWORD_MAP.find((k) => k.label === event.keyword) : detectEventKeyword(event.title);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [detailCardVisible, setDetailCardVisible] = useState(false);

  const handleLongPress = (eventData: any) => {
    const { pageX, pageY } = eventData.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: () => setDetailCardVisible(true),
    });
  }
  contextMenuActions.push({
    label: event.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: event.isCompleted ? 'close-circle' : 'check-circle',
    onPress: onToggle,
  });
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

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
      <>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <View style={[eventStyles.completedCard, { backgroundColor: completedColor + "30", borderColor: completedColor + "50" }]}>
            <View style={[eventStyles.completedDot, { backgroundColor: completedColor }]} />
            <Text style={[eventStyles.completedTitle, { color: completedColor }]} numberOfLines={1}>
              {event.title}
            </Text>
            {event.startTime && (
              <Text style={[eventStyles.completedTime, { color: completedColor + "99" }]}>
                {format12HourTime(event.startTime)}{event.endTime ? ` - ${format12HourTime(event.endTime)}` : ""}
              </Text>
            )}
            <MaterialIcons name="check-circle" size={18} color={completedColor} style={{ marginLeft: "auto" }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Note: Removed full-bleed image rendering - using keyword card instead

  // Active: illustrated card if keyword matches (fallback without image)
  if (keyword) {
    return (
      <>
        <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={[eventStyles.illustratedCard, { backgroundColor: event.color || keyword.bgColor, borderColor: keyword.accentColor + "40" }]}>
            <View style={eventStyles.illustratedContent}>
              <Text style={[eventStyles.illustratedTitle, { color: '#FFFFFF' }]}>{event.title}</Text>
              {event.startTime && (
                <Text style={[eventStyles.illustratedTime, { color: '#FFFFFFDD' }]}>
                  {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
                </Text>
              )}
              {event.location && (
                <Text style={[eventStyles.illustratedLocation, { color: '#FFFFFFBB' }]} numberOfLines={1}>
                  📍 {event.location}
                </Text>
              )}
            </View>
            <MaterialIcons name={keyword.icon as any} size={48} color="#FFFFFF" style={{ opacity: 0.9 }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  // Default event card (no keyword match)
  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        <View style={[eventStyles.defaultCard, { backgroundColor: event.color || colors.surface, borderColor: colors.border }]}>
          <View style={[eventStyles.defaultDot, { backgroundColor: event.color || colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[eventStyles.defaultTitle, { color: event.color ? '#FFFFFF' : colors.foreground }]}>{event.title}</Text>
            {event.startTime && (
              <Text style={[eventStyles.defaultTime, { color: event.color ? '#FFFFFFDD' : colors.muted }]}>
                {format12HourTime(event.startTime)}{event.endTime ? ` – ${format12HourTime(event.endTime)}` : ""}
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
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
    </>
  );
}

// ─── Todo Item Component ─────────────────────────────────────────────────────
function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete,
  people = [],
  events = [],
  ministries = [],
  isOverdue = false,
  isCurrentTodo = false,
}: {
  todo: ScheduleTodo;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
  events?: ScheduleEvent[];
  ministries?: ScheduleMinistry[];
  isOverdue?: boolean;
  isCurrentTodo?: boolean;
}) {
  const colors = useColors();
  const iconNameStr = getIconForTodo(todo.title);
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const overdueBadgeColor = isOverdue ? colors.error : undefined;

  const handleLongPress = (event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: onEdit,
    });
  }
  contextMenuActions.push({
    label: todo.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: todo.isCompleted ? 'close-circle' : 'check-circle',
    onPress: onToggle,
  });
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

  const linkedPeople = useMemo(() => {
    if (!todo.linkedPeopleIds || todo.linkedPeopleIds.length === 0) return [];
    return todo.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [todo.linkedPeopleIds, people]);

  const linkedEvent = useMemo(() => {
    if (!todo.linkedEventId) return null;
    return events.find((e) => e.id === todo.linkedEventId) || null;
  }, [todo.linkedEventId, events]);

  const linkedMinistry = useMemo(() => {
    if (!todo.linkedMinistryId) return null;
    return ministries.find((m) => m.id === todo.linkedMinistryId) || null;
  }, [todo.linkedMinistryId, ministries]);

  // Determine if this todo is in its active hour (glow effect)
  // Re-check every minute so it activates/deactivates without restart
  const [currentMinute, setCurrentMinute] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setCurrentMinute(n.getHours() * 60 + n.getMinutes());
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const isActiveHour = useMemo(() => {
    if (!todo.startTime || todo.isCompleted) return false;
    const [h, m] = todo.startTime.split(':').map(Number);
    const todoMinutes = h * 60 + m;
    return currentMinute >= todoMinutes && currentMinute < todoMinutes + 60;
  }, [todo.startTime, todo.isCompleted, currentMinute]);

  // Prominent glow animation on the icon - much stronger when it's the current todo
  const iconGlowOpacity = useSharedValue(0);
  useEffect(() => {
    if (isCurrentTodo && !todo.isCompleted) {
      iconGlowOpacity.value = withRepeat(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      iconGlowOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isCurrentTodo, todo.isCompleted, currentMinute]);

  const iconGlowStyle = useAnimatedStyle(() => {
    if (!isCurrentTodo || todo.isCompleted) return {};
    const color = todo.color || '#7C5CFF';
    return {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: interpolate(iconGlowOpacity.value, [0, 1], [0.5, 1.0]),
      shadowRadius: interpolate(iconGlowOpacity.value, [0, 1], [8, 20]),
      elevation: interpolate(iconGlowOpacity.value, [0, 1], [4, 12]),
    };
  });

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [todoStyles.row, pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[todoStyles.iconContainer, { backgroundColor: todo.isCompleted ? colors.success : (todo.color || colors.primary) }, iconGlowStyle]}>
          <MaterialIcons
            name={todo.isCompleted ? "check" : (iconNameStr as any)}
            size={16}
            color="#FFFFFF"
          />
        </ReAnimated.View>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
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
          {(todo.startTime || todo.notes) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 }}>
              {todo.startTime && (
                <Text style={{ fontSize: 11, color: todo.isCompleted ? colors.muted : colors.primary, fontWeight: '500' }}>
                  {format12HourTime(todo.startTime)}
                </Text>
              )}
              {todo.notes && (
                <Text
                  style={[
                    todoStyles.notes,
                    { color: colors.muted, marginTop: 0 },
                    todo.isCompleted && { textDecorationLine: "line-through" },
                  ]}
                  numberOfLines={1}
                >
                  {todo.notes}
                </Text>
              )}
            </View>
          )}
        </View>
        {linkedPeople.length > 0 && (
          <StackedAvatar people={linkedPeople} size={24} />
        )}
        {isOverdue && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.error, marginLeft: 'auto' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
              Overdue
            </Text>
          </View>
        )}
        {!isOverdue && (linkedEvent || linkedMinistry || todo.linkedEventTitle || todo.linkedMinistryTitle || todo.tag) && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: linkedEvent?.color || linkedMinistry?.color || todo.linkedEventColor || todo.linkedMinistryColor || (todo.color || colors.primary), marginLeft: 'auto' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }} numberOfLines={1}>
              {linkedEvent?.title || linkedMinistry?.title || todo.linkedEventTitle || todo.linkedMinistryTitle || todo.tag}
            </Text>
          </View>
        )}
      </Pressable>
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
    </>
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
  onEdit?: (updatedMinistry?: ScheduleMinistry) => void;
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
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
    // Don't scale the glow, just use opacity
    // glowScale.value = withRepeat(
    //   withTiming(1.005, {
    //     duration: 1500,
    //     easing: Easing.inOut(Easing.ease),
    //   }),
    //   -1,
    //   true
    // );
  }, []);

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [detailCardVisible, setDetailCardVisible] = useState(false);

  const handleLongPress = (eventData: any) => {
    const { pageX, pageY } = eventData.nativeEvent;
    setContextMenuPos({ x: pageX, y: pageY });
    setContextMenuVisible(true);
  };

  const contextMenuActions: ContextMenuAction[] = [];
  if (onEdit) {
    contextMenuActions.push({
      label: 'Edit',
      icon: 'edit',
      onPress: () => setDetailCardVisible(true),
    });
  }
  contextMenuActions.push({
    label: ministry.isCompleted ? 'Mark Incomplete' : 'Mark Complete',
    icon: ministry.isCompleted ? 'close-circle' : 'check-circle',
    onPress: onToggle,
  });
  if (onDelete) {
    contextMenuActions.push({
      label: 'Delete',
      icon: 'delete',
      onPress: onDelete,
      isDestructive: true,
    });
  }

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowColor: ministry.color || "#7C5CFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value * 0.8,
    shadowRadius: 16 + glowOpacity.value * 12,
    elevation: 12 + glowOpacity.value * 8,
  }));

  const linkedPeople = useMemo(() => {
    if (!ministry.linkedPeopleIds || ministry.linkedPeopleIds.length === 0) return [];
    return ministry.linkedPeopleIds
      .map((id) => people.find((p) => p.id === id))
      .filter((p) => p !== undefined) as Person[];
  }, [ministry.linkedPeopleIds, people]);

  if (ministry.isCompleted) {
    // Completed: solid color box, smaller
    const completedColor = ministry.color || "#7C5CFF";
    return (
      <>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <View style={[ministryStyles.completedCard, { backgroundColor: completedColor + "30", borderColor: completedColor + "50" }]}>
            <View style={[ministryStyles.completedDot, { backgroundColor: completedColor }]} />
            <Text style={[ministryStyles.completedTitle, { color: completedColor }]} numberOfLines={1}>
              {ministry.title}
            </Text>
            {ministry.startTime && (
              <Text style={[ministryStyles.completedTime, { color: completedColor + "99" }]}>
                {format12HourTime(ministry.startTime)}{ministry.endTime ? ` - ${format12HourTime(ministry.endTime)}` : ""}
              </Text>
            )}
            <MaterialIcons name="check-circle" size={18} color={completedColor} style={{ marginLeft: "auto" }} />
          </View>
        </Pressable>
        <ContextMenu
          visible={contextMenuVisible}
          x={contextMenuPos.x}
          y={contextMenuPos.y}
          actions={contextMenuActions}
          onDismiss={() => setContextMenuVisible(false)}
        />
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setDetailCardVisible(true);
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[animatedCardStyle, glowAnimatedStyle]}>
          <View style={[ministryStyles.card, { backgroundColor: colors.surface, borderColor: ministry.color || "#7C5CFF", borderWidth: 1.5 }]}>
            {/* Avatar positioned top-right */}
            {linkedPeople.length > 0 && (
              <View style={{ position: 'absolute', top: 8, right: 10 }}>
                <StackedAvatar people={linkedPeople} size={22} />
              </View>
            )}
            {/* Type tag */}
            <View style={[ministryStyles.typeTag, { backgroundColor: ministry.color || "#7C5CFF", marginBottom: 2 }]}>
              <MaterialIcons name={getMinistryTypeIcon(ministry.type as any) as any} size={11} color="#FFFFFF" />
              <Text style={{ color: "#FFFFFF", fontSize: 9, fontWeight: "600", marginLeft: 2 }}>{ministry.type}</Text>
            </View>
            {/* Title */}
            <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 2, paddingRight: linkedPeople.length > 0 ? 30 : 0 }} numberOfLines={1}>
              {ministry.title}
            </Text>
            {/* Time + Bible ref */}
            {(ministry.startTime || ministry.bibleBook) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {ministry.startTime && (
                  <Text style={{ fontSize: 11, color: colors.muted }}>
                    {format12HourTime(ministry.startTime)}{ministry.endTime ? ` – ${format12HourTime(ministry.endTime)}` : ""}
                  </Text>
                )}
                {ministry.bibleBook && (
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: "500" }}>
                    📖 {ministry.bibleBook}{ministry.bibleChapter ? ` ${ministry.bibleChapter}` : ""}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ReAnimated.View>
      </Pressable>
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
      <MinistryDetailCard
        ministry={ministry}
        people={people}
        visible={detailCardVisible}
        onClose={() => setDetailCardVisible(false)}
        onEdit={onEdit}
        onToggle={onToggle}
      />
    </>
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
  rightButton,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  rightButton?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const colors = useColors();
  const rotateAnim = useSharedValue(defaultExpanded ? 1 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotateAnim.value, [0, 1], [0, 90])}deg` }],
  }));

  return (
    <View style={[expandStyles.container, { borderColor: colors.border }]}>
      <View style={[expandStyles.headerContainer, { backgroundColor: colors.surface }]}>
        <Pressable
          onPress={() => {
            const next = !expanded;
            setExpanded(next);
            rotateAnim.value = withTiming(next ? 1 : 0, { duration: 200 });
          }}
          style={({ pressed }) => [expandStyles.header, pressed && { opacity: 0.7 }, { flex: 1 }]}
        >
          <MaterialIcons name={iconName(icon)} size={20} color={colors.primary} />
          <Text style={[expandStyles.title, { color: colors.foreground }]}>{title}</Text>
          <ReAnimated.View style={chevronStyle}>
            <MaterialIcons name="chevron-right" size={22} color={colors.muted} />
          </ReAnimated.View>
        </Pressable>
        {rightButton && <View style={{ paddingRight: 8 }}>{rightButton}</View>}
      </View>
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
  showWorshipAlbumForm = false,
  onShowWorshipAlbumForm,
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
  showWorshipAlbumForm?: boolean;
  onShowWorshipAlbumForm?: (show: boolean) => void;
  onTodoComplete?: (todoId: string) => void;
}) {
  const colors = useColors();
  const today = getTodayISOString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [ministries, setMinistries] = useState<ScheduleMinistry[]>([]);
  const [prayers, setPrayers] = useState<PrayerItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<"event" | "todo" | "ministry" | "bible-study" | "worship" | null>(null);
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
  const [formLinkedEventId, setFormLinkedEventId] = useState<string | null>(null); // Event linked to todo
  const [formLinkedMinistryId, setFormLinkedMinistryId] = useState<string | null>(null); // Ministry linked to todo
  const [formTodoTag, setFormTodoTag] = useState<string | null>(null); // Tag for todo (Ministry/Event/Family/Therapy/Personal)
  const [formTodoNotes, setFormTodoNotes] = useState(""); // Notes for todo
  const [bibleStudies, setBibleStudies] = useState<BibleStudySession[]>([]);
  const [worshipLists, setWorshipLists] = useState<any[]>([]);
  const [worshipListLinks, setWorshipListLinks] = useState<WorshipListLink[]>([]);
  const [worshipAlbums, setWorshipAlbums] = useState<Array<WorshipAlbum & { date: string; createdAt: string }>>([]);
  const [formSongLink, setFormSongLink] = useState("");
  const [formSpotifyLink, setFormSpotifyLink] = useState("");
  const [formAlbumCoverImage, setFormAlbumCoverImage] = useState<string | null>(null);
  const [formWorshipSongs, setFormWorshipSongs] = useState<any[]>([]);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);
  const [editingTimeBlock, setEditingTimeBlock] = useState<any>(null);
  const [showTimeBlockColorPicker, setShowTimeBlockColorPicker] = useState(false);
  const [timeBlockColors, setTimeBlockColors] = useState<Record<string, string>>({}); // Map of time block ID to color
  const [selectedBibleStudyDay, setSelectedBibleStudyDay] = useState<string | null>(null); // Day name for multi-day Bible study tracker
  const [chapterSummary, setChapterSummary] = useState<string>("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isPersonalStudyExpanded, setIsPersonalStudyExpanded] = useState(false); // Expandable Personal Study card state
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day'); // Calendar view mode toggle
  const [showViewMenu, setShowViewMenu] = useState(false); // Dropdown menu toggle
  const [currentDisplayAlbumId, setCurrentDisplayAlbumId] = useState<string | null>(null);
  const [albumHistory, setAlbumHistory] = useState<Array<WorshipAlbum & { id: string; addedAt: string }>>([]);
  const [showAlbumLibrary, setShowAlbumLibrary] = useState(false);
  
  // Load album history and current display album on mount
  useEffect(() => {
    const loadAlbumData = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('ALBUM_HISTORY_KEY');
        if (savedHistory) {
          const history = JSON.parse(savedHistory);
          setAlbumHistory(history);
          console.log('Loaded album history:', history.length);
        }
        const savedCurrentId = await AsyncStorage.getItem('CURRENT_DISPLAY_ALBUM_ID');
        if (savedCurrentId) {
          setCurrentDisplayAlbumId(savedCurrentId);
          console.log('Loaded current display album:', savedCurrentId);
        }
      } catch (e) {
        console.error('Error loading album data:', e);
      }
    };
    loadAlbumData();
  }, []);
  
  // Persist album history whenever it changes
  useEffect(() => {
    if (albumHistory.length > 0) {
      AsyncStorage.setItem('ALBUM_HISTORY_KEY', JSON.stringify(albumHistory)).catch(e => 
        console.error('Error saving album history:', e)
      );
    }
  }, [albumHistory]);
  
  // Persist current display album ID
  useEffect(() => {
    if (currentDisplayAlbumId) {
      AsyncStorage.setItem('CURRENT_DISPLAY_ALBUM_ID', currentDisplayAlbumId).catch(e => 
        console.error('Error saving current display album:', e)
      );
    } else {
      AsyncStorage.removeItem('CURRENT_DISPLAY_ALBUM_ID').catch(() => undefined);
    }
  }, [currentDisplayAlbumId]);
  
  // Load and persist worship albums (deprecated - keeping for backward compatibility)
  useEffect(() => {
    const loadWorshipAlbums = async () => {
      try {
        const saved = await AsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
        if (saved) {
          const albums = JSON.parse(saved);
          console.log('Loaded worship albums from storage:', albums.length);
          setWorshipAlbums(albums);
        }
      } catch (e) {
        console.error('Error loading worship albums:', e);
      }
    };
    loadWorshipAlbums();
  }, []);
  
  // Persist worship albums whenever they change
  useEffect(() => {
    if (worshipAlbums.length > 0) {
      AsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(worshipAlbums)).catch(e => 
        console.error('Error saving worship albums:', e)
      );
    }
  }, [worshipAlbums]);
  
  // Persist Personal Study expanded state
  useEffect(() => {
    const loadExpandedState = async () => {
      try {
        const saved = await AsyncStorage.getItem('personalStudyExpanded');
        if (saved !== null) {
          setIsPersonalStudyExpanded(saved === 'true');
        }
      } catch (e) {
        console.error('Error loading Personal Study expanded state:', e);
      }
    };
    loadExpandedState();
  }, []);
  
  const togglePersonalStudyExpanded = (newState: boolean) => {
    setIsPersonalStudyExpanded(newState);
    AsyncStorage.setItem('personalStudyExpanded', newState ? 'true' : 'false').catch(e => 
      console.error('Error saving Personal Study expanded state:', e)
    );
  };

  // Reset selectedBibleStudyDay when selectedDate changes so it auto-defaults to the current day
  useEffect(() => {
    setSelectedBibleStudyDay(null);
  }, [selectedDate]);

  // Color palette for todos, events, and ministries
  const COLOR_PALETTE = [
    { name: "Gray", hex: "#6B7280" },
    { name: "Red", hex: "#EF4444" },
    { name: "Orange", hex: "#F97316" },
    { name: "Yellow", hex: "#FBBF24" },
    { name: "Green", hex: "#10B981" },
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
    setSelectedDate((prev) => addDays(prev, 7));
  }, []);

  const handleSwipeRight = useCallback(() => {
    setSelectedDate((prev) => addDays(prev, -7));
  }, []);



  // Helper function to parse Bible reference from text (e.g., "1 Corinthians 1" -> {book: "1 Corinthians", chapter: "1"})
  const parseBibleReference = (text: string): { book: string; chapter: string } | null => {
    // Match patterns like "1 Corinthians 1", "Genesis 5", "John 3:16", etc.
    const match = text.match(/^([A-Za-z0-9\s]+?)\s+(\d+)/);
    if (match) {
      return { book: match[1].trim(), chapter: match[2] };
    }
    return null;
  };

  // Get all unique days with Bible studies from ALL sources (bibleStudies, ministries, events)
  const getUniqueBibleStudyDays = (bibleStudiesList: BibleStudySession[], ministriesList?: ScheduleMinistry[], eventsList?: ScheduleEvent[]): Array<{ dayName: string; date: string; book: string; chapter: number }> => {
    const dayMap = new Map<string, { date: string; book: string; chapter: number }>();
    
    // Helper to add an item to the day map
    const addToMap = (dateStr: string, book: string, chapter: number | string) => {
      // Fix timezone: parse YYYY-MM-DD as local date, not UTC
      const parts = dateStr.split('T')[0].split('-');
      const date = parts.length === 3 
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(dateStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const chapterNum = typeof chapter === 'string' ? parseInt(chapter, 10) || 0 : chapter;
      
      const existing = dayMap.get(dayName);
      if (!existing) {
        dayMap.set(dayName, { date: dateStr, book, chapter: chapterNum });
      } else {
        const existingDate = new Date(existing.date).getTime();
        const newDate = date.getTime();
        if (newDate > existingDate) {
          dayMap.set(dayName, { date: dateStr, book, chapter: chapterNum });
        }
      }
    };
    
    // Add from COMPLETED Bible Study sessions only
    bibleStudiesList.filter(s => s.isCompleted).forEach(study => {
      addToMap(study.date, study.book, study.chapter);
    });
    
    // Add from COMPLETED Read/Bible Study ministries with Bible info
    if (ministriesList) {
      ministriesList.forEach(m => {
        if (m.isCompleted && (m.type === 'Read' || m.type === 'Bible Study') && m.bibleBook && m.bibleChapter) {
          addToMap(m.date, m.bibleBook, m.bibleChapter);
        }
      });
    }
    
    // Add from COMPLETED events with Bible references in title
    if (eventsList) {
      eventsList.forEach(e => {
        if (e.isCompleted && e.title) {
          const parsed = parseBibleReference(e.title);
          if (parsed) {
            addToMap(e.date, parsed.book, parsed.chapter);
          }
        }
      });
    }
    
    // Convert to array and sort by most recent date
    return Array.from(dayMap.entries())
      .map(([dayName, data]) => ({ dayName, ...data }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // Get the Bible study for a specific day
  const getBibleStudyForDay = (bibleStudiesList: BibleStudySession[], dayName: string): string => {
    // Include all Bible studies (both completed and incomplete) for day selector navigation
    const dayStudies = bibleStudiesList.filter(study => {
      const date = new Date(study.date);
      return date.toLocaleDateString('en-US', { weekday: 'long' }) === dayName;
    });
    
    if (dayStudies.length === 0) return 'No studies';
    
    // Return the most recent study for this day
    const sorted = dayStudies.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0];
    return `${latest.book} ${latest.chapter}`;
  };

  // Helper function to get last chapter read for the selected day of week
  const getLastChapterRead = (ministriesList: ScheduleMinistry[], bibleStudiesList: BibleStudySession[], eventsList?: ScheduleEvent[], forDate?: string): string => {
    // Determine the target day of week from forDate
    let targetDayName: string | null = null;
    if (forDate) {
      const parts = forDate.split('T')[0].split('-');
      const date = parts.length === 3
        ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        : new Date(forDate);
      targetDayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    // Collect all completed Bible reading items from Read ministries, Bible Study sessions, and Bible Study events
    const allReadItems: Array<{ book: string; chapter: string; date: string; completedAt?: string; dayName: string }> = [];
    
    // Add completed Read/Bible Study ministries with Bible info
    const readMinistries = ministriesList.filter(
      (m) => {
        if (!m.isCompleted || (m.type !== 'Read' && m.type !== 'Bible Study') || !m.bibleBook || !m.bibleChapter) return false;
        return true;
      }
    );
    readMinistries.forEach(m => {
      // Fix timezone: parse YYYY-MM-DD as local date
      const mParts = m.date.split('T')[0].split('-');
      const date = mParts.length === 3 
        ? new Date(parseInt(mParts[0]), parseInt(mParts[1]) - 1, parseInt(mParts[2]))
        : new Date(m.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      allReadItems.push({
        book: m.bibleBook!,
        chapter: m.bibleChapter!,
        date: m.date,
        completedAt: m.completedAt,
        dayName
      });
    });
    
    // Add completed Bible Study sessions
    const completedStudies = bibleStudiesList.filter((s) => s.isCompleted);
    completedStudies.forEach(s => {
      // Fix timezone: parse YYYY-MM-DD as local date
      const sParts = s.date.split('T')[0].split('-');
      const date = sParts.length === 3 
        ? new Date(parseInt(sParts[0]), parseInt(sParts[1]) - 1, parseInt(sParts[2]))
        : new Date(s.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      allReadItems.push({
        book: s.book,
        chapter: s.chapter.toString(),
        date: s.date,
        completedAt: s.completedAt,
        dayName
      });
    });
    
    // Add completed events that contain Bible references
    if (eventsList) {
      const completedEvents = eventsList.filter((e) => {
        if (!e.isCompleted || !e.title) return false;
        return true;
      });
      completedEvents.forEach(e => {
        const parsed = parseBibleReference(e.title);
        if (parsed) {
          // Fix timezone: parse YYYY-MM-DD as local date
          const eParts = e.date.split('T')[0].split('-');
          const date = eParts.length === 3 
            ? new Date(parseInt(eParts[0]), parseInt(eParts[1]) - 1, parseInt(eParts[2]))
            : new Date(e.date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
          allReadItems.push({
            book: parsed.book,
            chapter: parsed.chapter,
            date: e.date,
            completedAt: e.completedAt,
            dayName
          });
        }
      });
    }
    
    if (allReadItems.length === 0) return '';
    
    // Filter by target day of week if specified
    const filtered = targetDayName
      ? allReadItems.filter(item => item.dayName === targetDayName)
      : allReadItems;
    
    if (filtered.length === 0) return '';
    
    // Sort by completedAt (most recent first), with date as fallback
    const sorted = filtered.sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
      return timeB - timeA; // Most recent first
    });
    
    const latest = sorted[0];
    return `${latest.book} ${latest.chapter}`
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, todosData, ministriesData, bibleStudiesData, timeBlockColorsData, worshipListsData, worshipLinksData, prayersData] = await Promise.all([
          AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
          AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
          AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
          AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY),
          AsyncStorage.getItem('SCHEDULE_TIME_BLOCK_COLORS_KEY'),
          AsyncStorage.getItem(WORSHIP_LISTS_KEY),
          AsyncStorage.getItem('WORSHIP_LIST_LINKS_KEY'),
          AsyncStorage.getItem('PRAYERS_KEY'),
        ]);
        if (eventsData) setEvents(JSON.parse(eventsData));
        if (todosData) setTodos(JSON.parse(todosData));
        if (ministriesData) setMinistries(JSON.parse(ministriesData));
        if (bibleStudiesData) setBibleStudies(JSON.parse(bibleStudiesData));
        if (timeBlockColorsData) setTimeBlockColors(JSON.parse(timeBlockColorsData));
        if (worshipListsData) setWorshipLists(JSON.parse(worshipListsData));
        if (worshipLinksData) setWorshipListLinks(JSON.parse(worshipLinksData));
        if (prayersData) setPrayers(JSON.parse(prayersData));
        const worshipAlbumsData = await AsyncStorage.getItem('WORSHIP_ALBUMS_KEY');
        if (worshipAlbumsData) setWorshipAlbums(JSON.parse(worshipAlbumsData));
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
    AsyncStorage.setItem('WORSHIP_LIST_LINKS_KEY', JSON.stringify(worshipListLinks)).catch(() => undefined);
  }, [worshipListLinks]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(todos)).catch(() => undefined);
  }, [todos]);

  useEffect(() => {
    AsyncStorage.setItem('PRAYERS_KEY', JSON.stringify(prayers)).catch(() => undefined);
  }, [prayers]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_MINISTRIES_KEY, JSON.stringify(ministries)).catch(() => undefined);
  }, [ministries]);
  useEffect(() => {
    AsyncStorage.setItem(SCHEDULE_BIBLE_STUDIES_KEY, JSON.stringify(bibleStudies)).catch(() => undefined);
  }, [bibleStudies]);
  useEffect(() => {
    AsyncStorage.setItem('SCHEDULE_TIME_BLOCK_COLORS_KEY', JSON.stringify(timeBlockColors)).catch(() => undefined);
  }, [timeBlockColors]);

  useEffect(() => {
    AsyncStorage.setItem('WORSHIP_ALBUMS_KEY', JSON.stringify(worshipAlbums)).catch(() => undefined);
  }, [worshipAlbums]);

  // Derived data for selected date
  const dateHeader = useMemo(() => formatDateHeader(selectedDate), [selectedDate]);
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const dayEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate]);
  const dayTodos = useMemo(() => getTodosForDate(todos, selectedDate), [todos, selectedDate]);
  const dayMinistries = useMemo(() => getMinistriesForDate(ministries, selectedDate), [ministries, selectedDate]);
  const dayBirthdays = useMemo(() => getBirthdaysForDate(people, selectedDate), [people, selectedDate]);

  // Fasting info for expandable card
  const activeFast = useMemo(() => getActiveFast(fasts, selectedDate), [fasts, selectedDate]);

  // Current Bible book and full state from AsyncStorage
  const [currentBibleBook, setCurrentBibleBook] = useState<string | null>(null);
  const [bibleState, setBibleState] = useState<UnifiedBibleState | null>(null);

  // Sync currentBibleBook whenever bibleState changes
  useEffect(() => {
    if (bibleState) {
      const display = getCurrentBibleDisplay(bibleState);
      setCurrentBibleBook(display || 'No book marked as current');
      
      // Fetch chapter summary
      const fetchSummary = async () => {
        const book = Object.entries(bibleState.bookStatuses).find(([_, status]) => status === 'current')?.[0];
        if (book) {
          const nextChapter = bibleState.chapters.find((c: any) => c.book === book && !c.isRead);
          if (nextChapter) {
            const cacheKey = `chapter-summary-${book}-${nextChapter.chapter}`;
            
            // Try to load from cache first
            try {
              const cached = await AsyncStorage.getItem(cacheKey);
              if (cached) {
                setChapterSummary(cached);
                return;
              }
            } catch (e) {
              console.error('Error reading cache:', e);
            }
            
            // Fetch from server if not cached
            setIsLoadingSummary(true);
            try {
              const client = createTRPCClient();
              const result = await client.bible.getChapterSummary.mutate({
                book,
                chapter: String(nextChapter.chapter),
              });
              const summaryData = result?.summary;
              const summary = typeof summaryData === 'string' ? summaryData : '';
              setChapterSummary(summary);
              
              // Cache the result
              if (summary) {
                try {
                  await AsyncStorage.setItem(cacheKey, summary);
                } catch (e) {
                  console.error('Error caching summary:', e);
                }
              }
            } catch (error) {
              console.error('Error fetching summary:', error);
              setChapterSummary('');
            } finally {
              setIsLoadingSummary(false);
            }
          }
        }
      };
      fetchSummary();
    }
  }, [bibleState]);

  useEffect(() => {
    const loadBibleData = async () => {
      try {
        // Try to load unified Bible state first
        let state: UnifiedBibleState | null = null;
        const unifiedData = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);
        
        if (unifiedData) {
          state = JSON.parse(unifiedData);
          if (state) console.log('Unified Bible data loaded:', { display: getCurrentBibleDisplay(state), bookStatuses: state.bookStatuses });
        } else {
          // Fallback: check for legacy book status and chapters
          const legacyBookStatus = await AsyncStorage.getItem('bibleBookStatus');
          const legacyChapters = await AsyncStorage.getItem('bibleChapters');
          
          if (legacyBookStatus || legacyChapters) {
            const legacyStatuses = legacyBookStatus ? JSON.parse(legacyBookStatus) : {};
            const legacyChapterData = legacyChapters ? JSON.parse(legacyChapters) : [];
            console.log('Found legacy data, migrating:', { legacyStatuses, chapterCount: legacyChapterData.length });
            
            // Convert legacy chapters to new format with readDate
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            const migratedChapters = legacyChapterData.map((ch: any) => ({
              book: ch.book,
              chapter: ch.chapter,
              isRead: ch.isRead || false,
              readDate: ch.isRead ? yesterdayStr : undefined,
              isBookmarked: ch.isBookmarked || false,
            }));
            
            // Create a new unified state with the legacy data
            state = {
              chapters: migratedChapters,
              bookStatuses: legacyStatuses,
            };
            
            // Save migrated state to unified storage
            await AsyncStorage.setItem(UNIFIED_BIBLE_KEY, JSON.stringify(state));
          }
        }
        
        if (state && state.bookStatuses) {
          setBibleState(state);
          const display = getCurrentBibleDisplay(state);
          if (display) setCurrentBibleBook(display);
          else setCurrentBibleBook('No book marked as current');
        } else {
          console.log('No Bible data found in either storage system');
          setCurrentBibleBook('No book marked as current');
        }
      } catch (e) {
        console.error('Error loading Bible data:', e);
        setCurrentBibleBook('Error loading Bible data');
      }
    };
    
    loadBibleData();
  }, []);

  // Profile data from AsyncStorage - use canonical PROFILE_STORAGE_KEY
  const [userName, setUserName] = useState("Friend");
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | undefined>(undefined);
  const [prayerStreak, setPrayerStreak] = useState(0);
  
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
  
  // Reload profile and Bible book when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      loadProfileData();
      
      const reloadBibleData = async () => {
        try {
          // Try to load unified Bible state first
          let state: UnifiedBibleState | null = null;
          const unifiedData = await AsyncStorage.getItem(UNIFIED_BIBLE_KEY);
          
          if (unifiedData) {
            state = JSON.parse(unifiedData);
            if (state) console.log('Unified Bible data reloaded on focus:', { display: getCurrentBibleDisplay(state), bookStatuses: state.bookStatuses });
          } else {
            // Fallback: check for legacy book status
            const legacyBookStatus = await AsyncStorage.getItem('bibleBookStatus');
            if (legacyBookStatus) {
              const legacyStatuses = JSON.parse(legacyBookStatus);
              console.log('Found legacy book status on focus, migrating:', legacyStatuses);
              
              // Create a new unified state with the legacy book statuses
              state = {
                chapters: [],
                bookStatuses: legacyStatuses,
              };
              
              // Save migrated state to unified storage
              await AsyncStorage.setItem(UNIFIED_BIBLE_KEY, JSON.stringify(state));
            }
          }
          
          if (state && state.bookStatuses) {
            setBibleState(state);
            const display = getCurrentBibleDisplay(state);
            if (display) setCurrentBibleBook(display);
            else setCurrentBibleBook('No book marked as current');
          } else {
            setCurrentBibleBook('No book marked as current');
          }
        } catch (e) {
          console.error('Error reloading Bible data:', e);
        }
      };
      
      reloadBibleData();
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
    setFormLinkedEventId(null);
    setFormLinkedMinistryId(null);
    setFormTodoTag(null);
    setFormSongLink("");
    setFormSpotifyLink("");
    setFormAlbumCoverImage(null);
    setFormBibleBook("Genesis");
    setFormBibleChapter("1");
  };

  const handleSaveEvent = () => {
    if (!formTitle.trim()) return;
    
    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;
    const normalizedEndTime = formEndTime ? normalizeTimeFormat(formEndTime) : undefined;
    
    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }
    if (formEndTime && !normalizedEndTime) {
      Alert.alert("Invalid Time", "End time must be in HH:mm format (24-hour)");
      return;
    }
    
    const newEvent = createScheduleEvent({
      title: formTitle.trim(),
      date: formDate || selectedDate,
      startTime: normalizedStartTime || undefined,
      endTime: normalizedEndTime || undefined,
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
    
    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;
    
    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }
    
    const newTodo = createScheduleTodo(
      { title: formTitle.trim(), date: formDate || selectedDate, startTime: normalizedStartTime || undefined, color: formColor, notes: formTodoNotes || undefined },
      todos.filter((t) => t.date === (formDate || selectedDate)).length
    );
    if (formLinkedPeopleIds.length > 0) {
      newTodo.linkedPeopleIds = formLinkedPeopleIds;
    }
    if (formLinkedEventId) {
      const linkedEvent = events.find((e) => e.id === formLinkedEventId);
      newTodo.linkedEventId = formLinkedEventId;
      if (linkedEvent) {
        newTodo.linkedEventTitle = linkedEvent.title;
        newTodo.linkedEventColor = linkedEvent.color;
      }
    }
    if (formLinkedMinistryId) {
      const linkedMinistry = ministries.find((m) => m.id === formLinkedMinistryId);
      newTodo.linkedMinistryId = formLinkedMinistryId;
      if (linkedMinistry) {
        newTodo.linkedMinistryTitle = linkedMinistry.title;
        newTodo.linkedMinistryColor = linkedMinistry.color;
      }
    }
    if (formTodoTag) {
      newTodo.tag = formTodoTag;
    }
    if (formTodoNotes) {
      newTodo.notes = formTodoNotes;
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

  const handleSaveMinistry = async () => {
    if (!formTitle.trim()) return;
    
    // Validate and normalize times to ensure they're in 24-hour HH:mm format
    const normalizedStartTime = formStartTime ? normalizeTimeFormat(formStartTime) : undefined;
    const normalizedEndTime = formEndTime ? normalizeTimeFormat(formEndTime) : undefined;
    
    if (formStartTime && !normalizedStartTime) {
      Alert.alert("Invalid Time", "Start time must be in HH:mm format (24-hour)");
      return;
    }
    if (formEndTime && !normalizedEndTime) {
      Alert.alert("Invalid Time", "End time must be in HH:mm format (24-hour)");
      return;
    }
    
    // If editing, update existing ministry; otherwise create new
    if (editingMinistry) {
      const updatedMinistry: ScheduleMinistry = {
        ...editingMinistry,
        title: formTitle.trim(),
        type: formMinistryType,
        date: formDate || selectedDate,
        dueDate: formDueDate || undefined,
        color: formColor,
        startTime: normalizedStartTime || undefined,
        endTime: normalizedEndTime || undefined,
        location: formLocation || undefined,
        notes: formNotes || undefined,
        linkedPeopleIds: formLinkedPeopleIds.length > 0 ? formLinkedPeopleIds : undefined,
        bibleBook: formBibleBook || undefined,
        bibleChapter: formBibleChapter || undefined,
      };
      
      setMinistries((prev) => prev.map((m) => m.id === editingMinistry.id ? updatedMinistry : m));
      setEditingMinistry(null);
    } else {
      const newMinistry = createScheduleMinistry({
        title: formTitle.trim(),
        type: formMinistryType,
        date: formDate || selectedDate,
        dueDate: formDueDate || undefined,
        color: formColor,
        startTime: normalizedStartTime || undefined,
        endTime: normalizedEndTime || undefined,
        location: formLocation || undefined,
        notes: formNotes || undefined,
      });
      if (formLinkedPeopleIds.length > 0) {
        newMinistry.linkedPeopleIds = formLinkedPeopleIds;
      }
      if (formBibleBook) {
        newMinistry.bibleBook = formBibleBook;
        newMinistry.bibleChapter = formBibleChapter;
      }
      setMinistries((prev) => [...prev, newMinistry]);
    }
    
    // Mark chapter as read if this is a Read ministry with Bible info
    if ((formMinistryType === "Read" || formMinistryType === "Bible Study") && formBibleBook && formBibleChapter) {
      try {
        const chapterNum = parseInt(formBibleChapter, 10);
        if (!isNaN(chapterNum)) {
          const updated = await markChapterAsRead(formBibleBook, chapterNum, false);
          setBibleState(updated);
          // Sync to old systems
          await syncUnifiedBibleToAllOldSystems(updated);
          // Reload display
          const newDisplay = getCurrentBibleDisplay(updated);
          setCurrentBibleBook(newDisplay || 'No book marked as current');
        }
      } catch (error) {
        console.error('Error marking Bible chapter as read:', error);
      }
    }
    
    resetForm();
    setAddType(null);
    setShowAddModal(false);
  };

  const handleAddSongToForm = async () => {
    if (!formSongLink.trim()) return;
    
    if (formSongLink.includes('spotify.com/playlist') || formSongLink.includes('spotify:playlist')) {
      try {
        const { extractPlaylistId, fetchSpotifyPlaylist } = await import('@/lib/spotify-api');
        const playlistId = extractPlaylistId(formSongLink);
        
        if (!playlistId) return;
        
        const playlist = await fetchSpotifyPlaylist(playlistId);
        if (!playlist) return;
        
        const newSongs = playlist.songs.map(song => ({
          id: song.id,
          title: song.name,
          artist: song.artist,
          album: song.album,
          imageUrl: song.imageUrl,
          spotifyUrl: song.spotifyUrl,
          duration: song.duration.toString(),
        }));
        
        setFormWorshipSongs([...formWorshipSongs, ...newSongs]);
        if (!formTitle) setFormTitle(playlist.name);
        setFormSongLink("");
      } catch (error) {
        console.error('Error fetching Spotify playlist:', error);
      }
    }
  };

  const pickAlbumCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setFormAlbumCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

    const handleSaveWorshipList = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Error', 'Please enter an album title');
      return;
    }
    console.log('DEBUG: Saving worship album');
    console.log('  formTitle:', formTitle);
    console.log('  formNotes (artist):', formNotes);
    console.log('  formDate:', formDate);
    console.log('  selectedDate:', selectedDate);
    console.log('  formAlbumCoverImage:', formAlbumCoverImage ? 'set' : 'not set');
    
    const newAlbum = {
      id: generateId(),
      title: formTitle.trim(),
      artist: formNotes.trim() || 'Unknown Artist',
      coverUrl: formAlbumCoverImage || formSongLink.trim() || '',
      spotifyUrl: formSpotifyLink.trim() || '',
      date: formDate || selectedDate,
      createdAt: new Date().toISOString(),
    };
    
    console.log('DEBUG: New album object:', newAlbum);
    
    // Add to album history
    setAlbumHistory((prev) => {
      const exists = prev.some(a => a.id === newAlbum.id);
      if (exists) return prev;
      return [...prev, { ...newAlbum, id: newAlbum.id, addedAt: new Date().toISOString() }];
    });
    
    // Set as current display album immediately - this triggers real-time update
    setCurrentDisplayAlbumId(newAlbum.id);
    
    Alert.alert('Saved', `Album saved: ${newAlbum.title}`);
    
    // Close modal and reset form
    setTimeout(() => {
      resetForm();
      setFormWorshipSongs([]);
      setAddType(null);
      setShowAddModal(false);
    }, 50);
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

  // Determine the "current" todo (next incomplete one based on time)
  const currentTodoId = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // Only calculate current todo for today
    if (selectedDate !== todayISO) return null;
    
    // Find the first incomplete todo whose time has passed or is current
    const incompleteTodos = dayTodos.filter(t => !t.isCompleted);
    for (const todo of incompleteTodos) {
      if (todo.startTime) {
        const [h, m] = todo.startTime.split(':').map(Number);
        const todoMinutes = h * 60 + m;
        // If this todo's time has arrived or is in progress, it's current
        if (currentMinutes >= todoMinutes) {
          return todo.id;
        }
      }
    }
    // If no todo time has arrived yet, highlight the first one
    return incompleteTodos.length > 0 ? incompleteTodos[0].id : null;
  }, [dayTodos, selectedDate]);

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

    // Add Bible Study sessions for the day (only if there are any)
    const dayBibleStudies = getBibleStudiesForDate(bibleStudies, selectedDate);
    if (dayBibleStudies.length > 0) {
      dayBibleStudies.forEach((bs) => {
        timedItems.push({
          type: "bible-study",
          id: bs.id,
          data: bs,
          sortTime: bs.startTime || "23:59",
        });
      });
    }

    // Calculate available time blocks - show on today and future days, not past days
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const isTodayOrFuture = selectedDate >= todayISO;

    let activeBlocks: ReturnType<typeof calculateAvailableTimeBlocks> = [];
    if (isTodayOrFuture) {
      const allScheduledItems = [
        ...dayTodos.filter((t) => t.startTime && !t.isCompleted),
        ...dayEvents.filter((e) => !e.isCompleted && e.startTime),
        ...dayMinistries.filter((m) => m.startTime && !m.isCompleted),
      ];
      const availableBlocks = calculateAvailableTimeBlocks(allScheduledItems);
      // Only filter expired blocks for today; future days show all blocks
      activeBlocks = selectedDate === todayISO
        ? filterExpiredTimeBlocks(availableBlocks, selectedDate)
        : availableBlocks;
    }

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

    // Add sorted items and insert current-time indicator if it's today
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (selectedDate === todayISO) {
      // Insert current-time-indicator at the right chronological position
      let inserted = false;
      for (let i = 0; i < allTimedItems.length; i++) {
        if (allTimedItems[i].sortTime.localeCompare(currentTimeStr) > 0) {
          items.push(allTimedItems[i]);
          if (!inserted) {
            items.push({
              type: "current-time-indicator",
              id: "current-time",
              data: { currentTime: currentTimeStr },
              sortTime: currentTimeStr,
            });
            inserted = true;
          }
        } else {
          items.push(allTimedItems[i]);
        }
      }
      if (!inserted) {
        // If we haven't inserted yet, add at the end
        items.push({
          type: "current-time-indicator",
          id: "current-time",
          data: { currentTime: currentTimeStr },
          sortTime: currentTimeStr,
        });
      }
    } else {
      allTimedItems.forEach((item) => items.push(item));
    }

    // Add completed events at the end (after current-time-indicator if present)
    const completedEvents = dayEvents.filter((e) => e.isCompleted);
    completedEvents.forEach((e) => items.push({ type: "event", id: e.id, data: e }));

    // Add completed Bible Study sessions
    const completedBibleStudies = dayBibleStudies.filter((bs) => bs.isCompleted);
    completedBibleStudies.forEach((bs) => items.push({ type: "bible-study", id: bs.id, data: bs }));

    // Add Personal Study as a card item in the schedule flow (before time blocks)
    const currentBibleDisplay = bibleState ? getCurrentBibleDisplay(bibleState) : 'No book marked as current';
    if (bibleState) {
      items.unshift({ type: "personal-study-card", id: "personal-study-card", data: { display: currentBibleDisplay, state: bibleState, chapterSummary: chapterSummary } });
    }

    // Get missed todos from previous days
    const missedTodos = todos.filter(t => {
      const todoDate = formatDateLocal(new Date(t.date));
      const selectedDateStr = formatDateLocal(new Date(selectedDate));
      return todoDate < selectedDateStr && !t.isCompleted;
    });

    // Expandable sections (missed todos, worship)
    items.push({ type: "expandable-missed-todos", id: "missed-todos-section", data: missedTodos });
    // Add worship section as a direct display (not expandable)
    items.push({ type: "worship-display", id: "worship-section", data: null });

    return items;
  }, [dayBirthdays, dayTodos, dayEvents, dayMinistries, bibleStudies, selectedDate, bibleState, chapterSummary, todos]);

  const renderItem = useCallback(
    ({ item }: { item: { type: string; id: string; data: any; isOverdue?: boolean } }) => {
      switch (item.type) {
        case "personal-study-card":
          return (
            <Pressable
              onPress={() => togglePersonalStudyExpanded(!isPersonalStudyExpanded)}
              style={({ pressed }) => [{ marginBottom: 12, marginHorizontal: 12, opacity: pressed ? 0.7 : 1 }]}
            >
              <View style={{ backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                <View style={{ padding: 16, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <MaterialIcons name="book" size={20} color={colors.primary} />
                      <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>Personal Study</Text>
                      {(() => {
                        const streakData = calculateReadingStreak(item.data.state);
                        if (streakData.streak > 0) {
                          return (
                            <View style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              backgroundColor: colors.primary + '15',
                              borderRadius: 16,
                              borderWidth: 1,
                              borderColor: colors.primary + '40',
                              marginLeft: 'auto',
                              marginRight: 8,
                              shadowColor: colors.primary,
                              shadowOffset: { width: 0, height: 0 },
                              shadowOpacity: 0.3,
                              shadowRadius: 8,
                              elevation: 3,
                            }}>
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                                {streakData.streak} days of devotion
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })()}
                    </View>
                    <MaterialIcons name={isPersonalStudyExpanded ? 'expand-less' : 'expand-more'} size={20} color={colors.muted} />
                  </View>

                  <View style={{ gap: 8 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>
                      {item.data.display}
                    </Text>
                    {(() => {
                      const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                      if (book) {
                        const progress = getBookProgress(item.data.state, book);
                        const percentage = Math.round((progress.read / progress.total) * 100);
                        return (
                          <View style={{ gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500' }}>
                                {progress.read} of {progress.total} chapters
                              </Text>
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                                {percentage}%
                              </Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>

                  {isPersonalStudyExpanded && (
                    <>
                      {isLoadingSummary || item.data.chapterSummary ? (
                        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                          <Text style={{ color: colors.muted, fontSize: 13, fontStyle: 'italic', lineHeight: 20 }}>
                            {isLoadingSummary ? 'Loading summary...' : item.data.chapterSummary}
                          </Text>
                        </View>
                      ) : null}

                      <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Pressable
                        onPress={async () => {
                          if (item.data?.state) {
                            const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (book) {
                              // Find the last read chapter
                              const lastReadChapter = item.data.state.chapters
                                .filter((c: any) => c.book === book && c.isRead)
                                .sort((a: any, b: any) => b.chapter - a.chapter)[0];
                              
                              if (lastReadChapter && lastReadChapter.chapter > 1) {
                                try {
                                  // Mark the last read chapter as unread to go back
                                  const updated = await markChapterAsUnread(book, lastReadChapter.chapter);
                                  setBibleState(updated);
                                  await syncUnifiedBibleToAllOldSystems(updated);
                                  const newDisplay = getCurrentBibleDisplay(updated);
                                  setCurrentBibleBook(newDisplay || 'No book marked as current');
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (error) {
                                  console.error('Error going back chapter:', error);
                                }
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ width: 44, height: 44, backgroundColor: colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                          <MaterialIcons name="arrow-back" size={18} color={colors.foreground} />
                        </View>
                      </Pressable>

                      <Pressable
                        onPress={async () => {
                          if (item.data?.state) {
                            const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (book) {
                              // Get the next unread chapter (the one currently being displayed)
                              const nextChapter = item.data.state.chapters.find((c: any) => c.book === book && !c.isRead);
                              
                              if (nextChapter) {
                                try {
                                  const { toggleChapterBookmark } = await import('@/lib/bible-unified');
                                  await toggleChapterBookmark(book, nextChapter.chapter);
                                  const updated = await loadUnifiedBible();
                                  setBibleState(updated);
                                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                } catch (error) {
                                  console.error('Error toggling bookmark:', error);
                                }
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      >
                        {(() => {
                          const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                          const nextChapter = book ? item.data.state.chapters.find((c: any) => c.book === book && !c.isRead) : null;
                          const isBookmarked = nextChapter ? nextChapter.isBookmarked : false;
                          
                          return (
                            <View style={{ width: 44, height: 44, backgroundColor: isBookmarked ? colors.primary + '20' : colors.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: isBookmarked ? 2 : 0, borderColor: isBookmarked ? colors.primary : 'transparent' }}>
                              <MaterialIcons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.primary} />
                            </View>
                          );
                        })()}
                      </Pressable>

                      <Pressable
                        onPress={async () => {
                          if (item.data?.state) {
                            const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                            if (book) {
                              const nextChapter = item.data.state.chapters.find((c: any) => c.book === book && !c.isRead);
                              if (nextChapter) {
                                try {
                                  const updated = await markChapterAsRead(book, nextChapter.chapter, false);
                                  setBibleState(updated);
                                  await syncUnifiedBibleToAllOldSystems(updated);
                                  const newDisplay = getCurrentBibleDisplay(updated);
                                  setCurrentBibleBook(newDisplay || 'No book marked as current');
                                  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                } catch (error) {
                                  console.error('Error marking chapter as read:', error);
                                }
                              }
                            }
                          }
                        }}
                        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                          <MaterialIcons name="check" size={18} color="#FFFFFF" />
                          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Mark as Read</Text>
                        </View>
                      </Pressable>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              </View>
            </Pressable>
          );
        case "birthday":
          return <BirthdayCard birthday={item.data} />;
        case "todo":
          return (
            <TodoItem
              todo={item.data}
              people={people}
              events={events}
              ministries={ministries}
              isOverdue={item.isOverdue}
              isCurrentTodo={item.data.id === currentTodoId}
              onToggle={() => setTodos((prev) => toggleTodoCompleted(prev, item.data.id))}
              onEdit={() => {
                setFormTitle(item.data.title);
                setFormDate(item.data.date);
                setFormStartTime(item.data.startTime || "");
                setAddType("todo");
                setShowAddModal(true);
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Todo',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setTodos((prev) => prev.filter(t => t.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            />
          );
        case "event":
          return (
            <EventCard
              event={item.data}
              people={people}
              onToggle={() => setEvents((prev) => toggleEventCompleted(prev, item.data.id))}
              onEdit={(updatedEvent) => {
                if (updatedEvent) {
                  setEvents((prev: ScheduleEvent[]) => prev.map((e: ScheduleEvent) => e.id === updatedEvent.id ? updatedEvent : e));
                }
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Event',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setEvents((prev) => prev.filter(e => e.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
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
                // Open ministry form in edit mode
                setEditingMinistry(item.data);
                setFormTitle(item.data.title);
                setFormDate(item.data.date);
                setFormMinistryType(item.data.type);
                setFormStartTime(item.data.startTime || "");
                setFormEndTime(item.data.endTime || "");
                setFormLocation(item.data.location || "");
                setFormNotes(item.data.notes || "");
                setFormBibleBook(item.data.bibleBook || "Genesis");
                setFormBibleChapter(item.data.bibleChapter || "");
                setFormColor(item.data.color || "#6366F1");
                setFormLinkedPeopleIds(item.data.linkedPeopleIds || []);
                setAddType("ministry");
                setShowAddModal(true);
              }}
              onDelete={() => {
                Alert.alert(
                  'Delete Ministry',
                  `Are you sure you want to delete "${item.data.title}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setMinistries((prev) => prev.filter((m) => m.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            />
          );
        case "bible-study":
          return (
            <EventCard
              event={{
                ...item.data,
                title: `${item.data.book} ${item.data.chapter}`,
                type: "Bible Study",
              }}
              onToggle={() => {
                console.log('DEBUG: Toggling Bible Study', item.data.id, 'currently isCompleted:', item.data.isCompleted);
                setBibleStudies((prev) => {
                  const updated = toggleBibleStudyCompleted(prev, item.data.id);
                  console.log('DEBUG: After toggle, Bible studies:', updated.map(s => ({ id: s.id, book: s.book, chapter: s.chapter, isCompleted: s.isCompleted, completedAt: s.completedAt })));
                  return updated;
                });
              }}
              onEdit={() => {}}
              onDelete={() => {
                Alert.alert(
                  'Delete Bible Study',
                  `Are you sure you want to delete "${item.data.book} ${item.data.chapter}"?`,
                  [
                    { text: 'Cancel', onPress: () => {}, style: 'cancel' },
                    {
                      text: 'Delete',
                      onPress: () => {
                        setBibleStudies((prev) => prev.filter((bs) => bs.id !== item.data.id));
                      },
                      style: 'destructive',
                    },
                  ]
                );
              }}
            />
          );
        case "worship-display": {
          // Get current album from history by ID
          const currentAlbum = currentDisplayAlbumId && albumHistory.find(a => a.id === currentDisplayAlbumId) || null;
          
          const handleDeleteAlbum = () => {
            setCurrentDisplayAlbumId(null);
          };
          
          const handleSelectAlbum = (albumId: string) => {
            setCurrentDisplayAlbumId(albumId);
          };
          
          return (
            <View style={[{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }]}>
              {/* Worship Header */}
              <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
                  <MaterialIcons name="music-note" size={20} color={colors.primary} />
                  <Text style={[{ fontSize: 16, fontWeight: '600', color: colors.foreground }]}>Worship</Text>
                </View>
                <View style={[{ flexDirection: 'row', gap: 8 }]}>
                  {albumHistory.length > 0 && (
                    <Pressable
                      onPress={() => setShowAlbumLibrary(true)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                    >
                      <MaterialIcons name="library-music" size={20} color={colors.primary} />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() => setAddType('worship')}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <MaterialIcons name="add" size={20} color={colors.primary} />
                  </Pressable>
                </View>
              </View>
              
              {/* Worship Album Display with Overlapping Pill */}
              {currentAlbum ? (
                <View style={[{ position: 'relative', alignItems: 'center', justifyContent: 'center', paddingBottom: 20 }]}>
                  {/* Vinyl Record */}
                  <VinylRecord albumArtUrl={currentAlbum.coverUrl} size={120} isPlaying={true} />
                  
                  {/* Overlapping Pill with Album Info and Delete Button */}
                  <View style={[{
                    position: 'absolute',
                    bottom: 0,
                    left: 16,
                    right: 16,
                    backgroundColor: colors.primary + '15',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: colors.primary + '40',
                  }]}>
                    <View style={[{ flex: 1, gap: 2 }]}>
                      <Text style={[{ fontSize: 13, fontWeight: '600', color: colors.foreground }]} numberOfLines={1}>{currentAlbum.title}</Text>
                      <Text style={[{ fontSize: 11, color: colors.muted }]} numberOfLines={1}>{currentAlbum.artist}</Text>
                    </View>
                    <Pressable
                      onPress={handleDeleteAlbum}
                      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }]}
                    >
                      <MaterialIcons name="close" size={20} color={colors.error} />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border }]}>
                  <MaterialIcons name="music-note" size={40} color={colors.muted} />
                  <Text style={[{ fontSize: 14, fontWeight: '500', color: colors.foreground }]}>Nothing chosen yet</Text>
                  <Text style={[{ fontSize: 12, color: colors.muted, textAlign: 'center' }]}>Tap + to add an album</Text>
                </View>
              )}
              

            </View>
          );
        }
        case "expandable-missed-todos":
          return (
            <ExpandableSection title={`Missed Todos (${item.data?.length || 0})`} icon="assignment">
              {item.data && item.data.length > 0 ? (
                <View style={{ gap: 8 }}>
                  {item.data.map((todo: any) => (
                    <View key={todo.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '500' }}>
                          {todo.title}
                        </Text>
                        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>
                          {new Date(todo.date).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, isCompleted: true } : t))}
                          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.success, borderRadius: 6 }]}
                        >
                          <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>✓</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setTodos(prev => prev.filter(t => t.id !== todo.id))}
                          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.error, borderRadius: 6 }]}
                        >
                          <Text style={{ color: colors.background, fontSize: 12, fontWeight: '600' }}>✕</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  No missed todos. Great job!
                </Text>
              )}
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
            <ExpandableSection title="Personal Study" icon="menu-book" defaultExpanded={true}>
              {item.data?.state ? (
                <View style={{ gap: 12 }}>
                  <View style={{ paddingHorizontal: 4 }}>
                    <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>
                      {item.data.display}
                    </Text>
                    {(() => {
                      const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                      if (book) {
                        const progress = getBookProgress(item.data.state, book);
                        const percentage = Math.round((progress.read / progress.total) * 100);
                        return (
                          <View style={{ marginTop: 8, gap: 6 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '500' }}>
                                {progress.read} of {progress.total} chapters
                              </Text>
                              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>
                                {percentage}%
                              </Text>
                            </View>
                            <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: colors.primary, borderRadius: 3 }} />
                            </View>
                          </View>
                        );
                      }
                      return null;
                    })()}
                  </View>
                  <Pressable
                    onPress={async () => {
                      if (item.data?.state) {
                        const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                        if (book) {
                          const nextChapter = item.data.state.chapters.find((c: any) => c.book === book && !c.isRead);
                          if (nextChapter) {
                            try {
                              const updated = await markChapterAsRead(book, nextChapter.chapter, false);
                              setBibleState(updated);
                              // Sync to old systems
                              await syncUnifiedBibleToAllOldSystems(updated);
                              // Reload display
                              const newDisplay = getCurrentBibleDisplay(updated);
                              setCurrentBibleBook(newDisplay || 'No book marked as current');
                              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            } catch (error) {
                              console.error('Error marking chapter as read:', error);
                            }
                          }
                        }
                      }
                    }}
                    style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                      <MaterialIcons name="check" size={20} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600' }}>Mark as Read</Text>
                    </View>
                  </Pressable>
                </View>
              ) : (
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  {item.data?.display || "No book marked as current."}
                </Text>
              )}
            </ExpandableSection>
          );
        case "time-block":
          return (
            <TimeBlockIndicator block={item.data.block} />
          );
        case "current-time-indicator":
          return <NowIndicator />;
        default:
          return null;
      }
    },
    [colors, selectedDate, people, currentTodoId, isPersonalStudyExpanded, setIsPersonalStudyExpanded]
  );

  return (
    <View style={[scheduleStyles.container, { backgroundColor: colors.background }]}>
      {/* Fixed Schedule Title with View Mode Toggle */}
      <View style={[scheduleStyles.scheduleTitle, { borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Text style={[scheduleStyles.scheduleTitleText, { color: colors.foreground }]}>Schedule</Text>
        <View style={{ position: 'relative' }}>
          <Pressable
            onPress={() => setShowViewMenu(!showViewMenu)}
            style={({ pressed }) => [{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.7 : 1,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }]}
          >
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#FFFFFF',
              textTransform: 'capitalize',
            }}>
              {viewMode}
            </Text>
            <MaterialIcons name={showViewMenu ? 'expand-less' : 'expand-more'} size={16} color="#FFFFFF" />
          </Pressable>
          {showViewMenu && (
            <View style={{
              position: 'absolute',
              top: 36,
              right: 0,
              backgroundColor: colors.surface,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              zIndex: 1000,
              minWidth: 100,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 5,
            }}>
              {(['day', 'week', 'month'] as const).map((mode, index) => (
                <Pressable
                  key={mode}
                  onPress={() => {
                    setViewMode(mode);
                    setShowViewMenu(false);
                  }}
                  style={({ pressed }) => [{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: viewMode === mode ? colors.primary + '20' : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                    borderBottomWidth: index < 2 ? 1 : 0,
                    borderBottomColor: colors.border,
                  }]}
                >
                  <Text style={{
                    fontSize: 12,
                    fontWeight: viewMode === mode ? '600' : '400',
                    color: viewMode === mode ? colors.primary : colors.foreground,
                    textTransform: 'capitalize',
                  }}>
                    {mode}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>



      {/* Content area */}
      <ReAnimated.View style={[{ flex: 1 }]}>
        {viewMode === 'day' ? (
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
                  {(() => {
                    // Calculate available hours based on INCOMPLETE items only
                    // This way, as you mark items complete, available time increases
                    const incompleteScheduledItems = [
                      ...getTodosForDate(todos, selectedDate)
                        .filter((t) => t.startTime && !t.isCompleted)
                        .map((t) => ({
                          ...t,
                          // Todos without end time default to 30 minutes
                          endTime: t.endTime || minutesToTime(timeToMinutes(t.startTime!) + 30),
                        })),
                      ...getEventsForDate(events, selectedDate).filter((e) => e.startTime && !e.isCompleted),
                      ...getMinistriesForDate(ministries, selectedDate).filter((m) => m.startTime && !m.isCompleted),
                    ];
                    // Calculate time blocks based on incomplete items only
                    // Use 6am-6pm business hours (06:00 to 18:00)
                    const summaryBlocks = calculateAvailableTimeBlocks(incompleteScheduledItems, '06:00', '18:00');
                    
                    // Filter blocks to only include time from now onwards (for today)
                    const now = new Date();
                    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
                    const selectedDateObj = new Date(selectedDate);
                    const isToday = selectedDateObj.toDateString() === now.toDateString();
                    
                    const activeSummaryBlocks = isToday 
                      ? summaryBlocks.filter((block) => {
                          const blockEndMinutes = parseInt(block.endTime.split(':')[0]) * 60 + parseInt(block.endTime.split(':')[1]);
                          return blockEndMinutes > currentTimeMinutes; // Only include blocks that haven't ended
                        }).map((block) => {
                          const blockStartMinutes = parseInt(block.startTime.split(':')[0]) * 60 + parseInt(block.startTime.split(':')[1]);
                          // If block starts before now, adjust duration to start from now
                          if (blockStartMinutes < currentTimeMinutes) {
                            const blockEndMinutes = parseInt(block.endTime.split(':')[0]) * 60 + parseInt(block.endTime.split(':')[1]);
                            const adjustedDuration = blockEndMinutes - currentTimeMinutes;
                            return { ...block, durationMinutes: adjustedDuration };
                          }
                          return block;
                        })
                      : summaryBlocks;
                    
                    const totalAvailableMinutes = activeSummaryBlocks.reduce((sum, b) => sum + b.durationMinutes, 0);
                    // Format as "Xh Ym" instead of just hours
                    const availableHours = Math.floor(totalAvailableMinutes / 60);
                    const availableMinutes = totalAvailableMinutes % 60;
                    const availableTimeString = availableMinutes > 0 ? `${availableHours}h ${availableMinutes}m` : `${availableHours}h`;
                    

                    
                    return (
                      <DailySummaryCard
                        remainingTodos={getTodosForDate(todos, selectedDate).filter(t => !t.isCompleted).length}
                        remainingPrayers={memoizedSummaryData.remainingPrayers}
                        fastingStatus={memoizedSummaryData.fastingStatus}
                        budgetAmount={memoizedSummaryData.budgetAmount}
                        peopleToReach={memoizedSummaryData.peopleToReach}
                        currentBibleStudy={getLastChapterRead(ministries, bibleStudies, events, selectedDate)}
                        bibleStudyDays={getUniqueBibleStudyDays(bibleStudies, ministries, events)}
                        selectedBibleStudyDay={selectedBibleStudyDay}
                        selectedDate={selectedDate}
                        onBibleStudyDayChange={(dayName) => setSelectedBibleStudyDay(dayName)}
                        onDeleteBibleStudyDay={(dayName) => {
                          // Remove all Bible studies, ministries, and events for this day of week
                          setBibleStudies(prev => prev.filter(s => {
                            const d = new Date(s.date);
                            return d.toLocaleDateString('en-US', { weekday: 'long' }) !== dayName;
                          }));
                          // Remove Read/Bible Study ministries for this day
                          setMinistries(prev => prev.filter(m => {
                            if ((m.type === 'Read' || m.type === 'Bible Study') && m.bibleBook && m.bibleChapter) {
                              const d = new Date(m.date);
                              return d.toLocaleDateString('en-US', { weekday: 'long' }) !== dayName;
                            }
                            return true;
                          }));
                          // Reset selection
                          setSelectedBibleStudyDay(null);
                        }}
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
                        availableHours={availableHours}
                        availableTimeString={availableTimeString}
                        userProfilePhoto={userProfilePhoto}
                        prayerStreak={prayerStreak}

                      />
                    );
                  })()}
                  
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
                    {/* Today button moved to bottom - see renderItem */}
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
        ) : viewMode === 'week' ? (
          <WeeklyCalendarView
            selectedDate={new Date(selectedDate)}
            timeBlocks={(() => {
              const blocks: any[] = [];
              // Get all items for the entire week
              const weekStart = getWeekStart(new Date(selectedDate));
              for (let i = 0; i < 7; i++) {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + i);
                const dateStr = formatDateLocal(date);
                // Add todos
                getTodosForDate(todos, dateStr).forEach((t: any) => {
                  blocks.push({
                    id: `${dateStr}-${t.id}`,
                    title: t.title,
                    startTime: t.startTime || '09:00',
                    endTime: t.endTime || minutesToTime(timeToMinutes(t.startTime || '09:00') + 30),
                    color: t.color || colors.primary,
                    isCompleted: t.isCompleted,
                  });
                });
                // Add events
                getEventsForDate(events, dateStr).forEach(e => {
                  blocks.push({
                    id: `${dateStr}-${e.id}`,
                    title: e.title,
                    startTime: e.startTime || '09:00',
                    endTime: e.endTime || minutesToTime(timeToMinutes(e.startTime || '09:00') + 60),
                    color: e.color || colors.primary,
                    isCompleted: e.isCompleted,
                  });
                });
                // Add ministries
                getMinistriesForDate(ministries, dateStr).forEach(m => {
                  blocks.push({
                    id: `${dateStr}-${m.id}`,
                    title: m.title,
                    startTime: m.startTime || '09:00',
                    endTime: m.endTime || minutesToTime(timeToMinutes(m.startTime || '09:00') + 60),
                    color: m.color || colors.primary,
                    isCompleted: m.isCompleted,
                  });
                });
              }
              return blocks;
            })()}
            onDayPress={(date) => setSelectedDate(formatDateLocal(date))}
          />
        ) : (
          <MonthlyCalendarView
            selectedDate={new Date(selectedDate)}
            events={(() => {
              const eventMap = new Map<string, any[]>();
              // Add todos
              todos.forEach(t => {
                if (t.startTime) {
                  const dateStr = t.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: t.id, title: t.title, color: t.color || colors.primary, type: 'todo', isCompleted: t.isCompleted });
                }
              });
              // Add events
              events.forEach(e => {
                if (e.startTime) {
                  const dateStr = e.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: e.id, title: e.title, color: e.color || colors.primary, type: 'event', isCompleted: e.isCompleted });
                }
              });
              // Add ministries
              ministries.forEach(m => {
                if (m.startTime) {
                  const dateStr = m.date || selectedDate;
                  const key = dateStr;
                  if (!eventMap.has(key)) eventMap.set(key, []);
                  eventMap.get(key)!.push({ id: m.id, title: m.title, color: m.color || colors.primary, type: 'ministry', isCompleted: m.isCompleted });
                }
              });
              return eventMap;
            })()}
            onDayPress={(date) => setSelectedDate(formatDateLocal(date))}
          />
        )}
        </ReAnimated.View>

      {/* FAB Button with Google Calendar-style popup menu */}
      <Pressable
        onPress={() => setShowAddModal(!showAddModal)}
        style={({ pressed }) => [scheduleStyles.fab, { backgroundColor: colors.primary }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }]}
      >
        <MaterialIcons name={showAddModal ? "close" : "add"} size={32} color="#FFFFFF" />
      </Pressable>

      {/* Floating Today Button - Over Tab Bar */}
      {selectedDate !== today && (
        <Pressable
          onPress={() => setSelectedDate(today)}
          style={({ pressed }) => [
            scheduleStyles.floatingTodayButton,
            {
              backgroundColor: 'rgba(123, 92, 255, 0.85)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <MaterialIcons name="today" size={14} color="#FFFFFF" />
          <Text style={scheduleStyles.floatingTodayButtonText}>Today</Text>
        </Pressable>
      )}

      {/* Google Calendar-style popup menu */}
      {showAddModal && (
        <>
          <Pressable style={scheduleStyles.fabOverlay} onPress={() => setShowAddModal(false)} />
          <View style={[scheduleStyles.fabMenu, { backgroundColor: colors.surface }]}>
            <Pressable
              onPress={() => {
                setAddType("ministry");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#7C5CFF" }]}>
                <MaterialIcons name="volunteer-activism" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Ministry</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAddType("event");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#3DAA78" }]}>
                <MaterialIcons name="event" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Event</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAddType("todo");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#E3B341" }]}>
                <MaterialIcons name="check-box" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Todo</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setAddType("worship");
                setShowAddModal(false);
              }}
              style={({ pressed }) => [scheduleStyles.fabMenuItem, pressed && { opacity: 0.7 }]}
            >
              <View style={[scheduleStyles.fabMenuIcon, { backgroundColor: "#9C27B0" }]}>
                <MaterialIcons name="music-note" size={20} color="#FFFFFF" />
              </View>
              <Text style={[scheduleStyles.fabMenuLabel, { color: colors.foreground }]}>Worship</Text>
            </Pressable>

          </View>
        </>
      )}

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
            <ScrollView style={scheduleStyles.formContent} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
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
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>NOTES (optional)</Text>
              <TextInput
                value={formTodoNotes}
                onChangeText={setFormTodoNotes}
                placeholder="Add any notes or details for this todo"
                placeholderTextColor={colors.muted}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border, minHeight: 80, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
              />
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>TAG (optional)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {['Ministry', 'Event', 'Family', 'Therapy', 'Personal'].map((tag) => (
                  <Pressable
                    key={tag}
                    onPress={() => {
                      setFormTodoTag(formTodoTag === tag ? null : tag);
                    }}
                    style={({ pressed }) => [{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: formTodoTag === tag ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    }]}
                  >
                    <Text style={[{
                      color: formTodoTag === tag ? '#fff' : colors.foreground,
                      fontSize: 12,
                      fontWeight: '500',
                    }]}>
                      {tag}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>LINK TO EVENT OR MINISTRY (optional)</Text>
              <View style={{ gap: 8, marginBottom: 16 }}>
                {(() => {
                  const today = getTodayISOString();
                  const upcomingEvents = events.filter(e => e.date && e.date >= today);
                  return upcomingEvents.length > 0 && (
                    <View>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 11, marginBottom: 6 }]}>EVENTS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {upcomingEvents.map((event) => (
                        <Pressable
                          key={event.id}
                          onPress={() => {
                            if (formLinkedEventId === event.id) {
                              setFormLinkedEventId(null);
                              setFormTodoTag(null);
                            } else {
                              setFormLinkedEventId(event.id);
                              setFormTodoTag('Event');
                              setFormLinkedMinistryId(null);
                            }
                          }}
                          style={({ pressed }) => [{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: formLinkedEventId === event.id ? colors.primary : colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: pressed ? 0.8 : 1,
                          }]}
                        >
                          <Text style={[{
                            color: formLinkedEventId === event.id ? '#fff' : colors.foreground,
                            fontSize: 12,
                            fontWeight: '500',
                          }]}>
                            {event.title} {event.date && `• ${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </Text>
                        </Pressable>
                      ))}
                      </View>
                    </View>
                  );
                })()}
                {(() => {
                  return ministries.length > 0 && (
                    <View>
                      <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 11, marginBottom: 6 }]}>MINISTRIES</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {ministries.map((ministry) => (
                        <Pressable
                          key={ministry.id}
                          onPress={() => {
                            if (formLinkedMinistryId === ministry.id) {
                              setFormLinkedMinistryId(null);
                              setFormTodoTag(null);
                            } else {
                              setFormLinkedMinistryId(ministry.id);
                              setFormTodoTag('Ministry');
                              setFormLinkedEventId(null);
                            }
                          }}
                          style={({ pressed }) => [{
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            backgroundColor: formLinkedMinistryId === ministry.id ? colors.primary : colors.background,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: pressed ? 0.8 : 1,
                          }]}
                        >
                          <Text style={[{
                            color: formLinkedMinistryId === ministry.id ? '#fff' : colors.foreground,
                            fontSize: 12,
                            fontWeight: '500',
                          }]}>
                            {ministry.title} {ministry.date && `• ${new Date(ministry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </Text>
                        </Pressable>
                        ))}
                      </View>
                    </View>
                  );
                })()}
              </View>
            </ScrollView>
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
                  <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>BIBLE BOOK & CHAPTER (optional)</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                    <TextInput
                      value={formBibleBook}
                      onChangeText={setFormBibleBook}
                      placeholder="e.g., Genesis"
                      placeholderTextColor={colors.muted}
                      style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border, flex: 1 }]}
                      returnKeyType="done"
                    />
                    <TextInput
                      value={formBibleChapter}
                      onChangeText={setFormBibleChapter}
                      placeholder="Ch."
                      placeholderTextColor={colors.muted}
                      style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border, width: 60 }]}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
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

      {/* Add Modal - Worship List Form */}
      <Modal transparent visible={addType === "worship"} animationType="slide" onRequestClose={() => { setAddType(null); resetForm(); }}>
        <View style={scheduleStyles.formOverlay}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => { setAddType(null); resetForm(); }} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>  
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>Add Album</Text>
              <Pressable onPress={handleSaveWorshipList} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <Text style={[scheduleStyles.formSave, { color: colors.primary }]}>Add</Text>
              </Pressable>
            </View>
            <ScrollView style={scheduleStyles.formContent} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              {/* Album Preview */}
              {(formTitle || formNotes || formAlbumCoverImage || formSongLink) && (
                <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 12 }]}>
                  {formAlbumCoverImage ? (
                    <Image
                      source={{ uri: formAlbumCoverImage }}
                      style={{ width: 120, height: 120, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : formSongLink ? (
                    <Image
                      source={{ uri: formSongLink }}
                      style={{ width: 120, height: 120, borderRadius: 8 }}
                      contentFit="cover"
                    />
                  ) : isLoadingSpotify ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ width: 120, height: 120 }} />
                  ) : null}
                  {formTitle && (
                    <Text style={[scheduleStyles.formLabel, { color: colors.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }]}>{formTitle}</Text>
                  )}
                  {formNotes && (
                    <Text style={[scheduleStyles.formLabel, { color: colors.muted, fontSize: 12, textAlign: 'center' }]}>{formNotes}</Text>
                  )}
                </View>
              )}
              
              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Title *</Text>
              <TextInput
                placeholder="e.g., Hillsong Worship"
                placeholderTextColor={colors.muted}
                value={formTitle}
                onChangeText={setFormTitle}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Artist *</Text>
              <TextInput
                placeholder="e.g., Hillsong United"
                placeholderTextColor={colors.muted}
                value={formNotes}
                onChangeText={setFormNotes}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Cover</Text>
              <Pressable
                onPress={pickAlbumCover}
                style={({ pressed }) => [scheduleStyles.formInput, { backgroundColor: colors.background, borderColor: colors.primary, borderWidth: 2, justifyContent: 'center', alignItems: 'center', height: 100, opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="image" size={32} color={colors.primary} />
                <Text style={[scheduleStyles.formLabel, { color: colors.primary, marginTop: 8 }]}>Tap to upload cover</Text>
              </Pressable>
              {formAlbumCoverImage && (
                <Pressable
                  onPress={() => setFormAlbumCoverImage(null)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1, marginTop: 8 }]}
                >
                  <Text style={[scheduleStyles.formLabel, { color: colors.error }]}>Clear image</Text>
                </Pressable>
              )}

              <Text style={[scheduleStyles.formLabel, { color: colors.muted }]}>DATE</Text>
              <DateTimePicker
                value={formDate || selectedDate}
                onChange={setFormDate}
                mode="date"
                label="Select Date"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Album Cover URL (optional)</Text>
              <TextInput
                placeholder="https://example.com/cover.jpg"
                placeholderTextColor={colors.muted}
                value={formSongLink}
                onChangeText={setFormSongLink}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
              />

              <Text style={[scheduleStyles.formLabel, { color: colors.foreground }]}>Spotify Link</Text>
              <TextInput
                placeholder="https://open.spotify.com/album/..."
                placeholderTextColor={colors.muted}
                value={formSpotifyLink}
                onChangeText={async (text) => {
                  setFormSpotifyLink(text);
                  
                  // Auto-fetch album metadata from Spotify link
                  if (text.includes('spotify.com/album') || text.includes('spotify:album')) {
                    setIsLoadingSpotify(true);
                    try {
                      const { type, id } = parseSpotifyUrl(text);
                      if (type === 'album' && id) {
                        const album = await fetchSpotifyAlbum(id);
                        if (album) {
                          setFormTitle(album.name);
                          setFormNotes(album.artist);
                          setFormSongLink(album.imageUrl || '');
                        }
                      }
                    } catch (error) {
                      console.error('Error fetching Spotify album:', error);
                    } finally {
                      setIsLoadingSpotify(false);
                    }
                  }
                }}
                style={[scheduleStyles.formInput, { color: colors.foreground, borderColor: colors.border }]}
                returnKeyType="done"
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Album Library Modal */}
      <Modal transparent visible={showAlbumLibrary} animationType="slide" onRequestClose={() => setShowAlbumLibrary(false)}>
        <View style={[scheduleStyles.formOverlay, { backgroundColor: colors.background + 'E6' }]}>
          <View style={[scheduleStyles.formSheet, { backgroundColor: colors.surface, maxHeight: '80%' }]}>
            <View style={scheduleStyles.formHeader}>
              <Pressable onPress={() => setShowAlbumLibrary(false)} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                <MaterialIcons name="close" size={28} color={colors.foreground} />
              </Pressable>
              <Text style={[scheduleStyles.formTitle, { color: colors.foreground }]}>Album Library</Text>
              <View style={{ width: 28 }} />
            </View>
            <ScrollView style={[{ flex: 1, paddingHorizontal: 16 }]} showsVerticalScrollIndicator={false}>
              <View style={[{ gap: 12, paddingVertical: 16 }]}>
                {albumHistory.length === 0 ? (
                  <Text style={[{ color: colors.muted, textAlign: 'center', marginTop: 24 }]}>No albums saved yet</Text>
                ) : (
                  albumHistory.map((album) => (
                    <Pressable
                      key={album.id}
                      onPress={() => {
                        setCurrentDisplayAlbumId(album.id);
                        setShowAlbumLibrary(false);
                      }}
                      style={({ pressed }) => [{
                        flexDirection: 'row',
                        gap: 12,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: currentDisplayAlbumId === album.id ? colors.primary + '20' : colors.background,
                        borderWidth: 1,
                        borderColor: currentDisplayAlbumId === album.id ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      }]}
                    >
                      {album.coverUrl ? (
                        <Image source={{ uri: album.coverUrl }} style={[{ width: 60, height: 60, borderRadius: 8 }]} />
                      ) : (
                        <View style={[{ width: 60, height: 60, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
                          <MaterialIcons name="music-note" size={28} color={colors.muted} />
                        </View>
                      )}
                      <View style={[{ flex: 1, justifyContent: 'center', gap: 2 }]}>
                        <Text style={[{ fontSize: 14, fontWeight: '600', color: colors.foreground }]} numberOfLines={1}>{album.title}</Text>
                        <Text style={[{ fontSize: 12, color: colors.muted }]} numberOfLines={1}>{album.artist}</Text>
                      </View>
                      {currentDisplayAlbumId === album.id && (
                        <MaterialIcons name="check-circle" size={24} color={colors.primary} />
                      )}
                    </Pressable>
                  ))
                )}
              </View>
            </ScrollView>
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
    alignItems: "center",
    marginBottom: 16,
  },
  dayName: {
    fontSize: 48,
    fontWeight: "800",
    lineHeight: 52,
  },
  dateRight: {
    alignItems: "flex-end",
    paddingTop: 0,
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
  backToTodayButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  backToTodayText: {
    fontSize: 14,
    fontWeight: "600",
  },
  backToTodayPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
    marginBottom: 0,
    justifyContent: "center",
  },
  backToTodayPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  floatingTodayButton: {
    position: "absolute",
    bottom: 130,
    left: "50%",
    marginLeft: -60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 101,
  },
  floatingTodayButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
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
    zIndex: 100,
  },
  fabOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
  },
  fabMenu: {
    position: "absolute",
    right: 20,
    bottom: 130,
    borderRadius: 12,
    paddingVertical: 8,
    zIndex: 101,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fabMenuIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuLabel: {
    fontSize: 14,
    fontWeight: "500",
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
  notes: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});

const ministryStyles = StyleSheet.create({
  card: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    marginHorizontal: 12,
    borderWidth: 1,
    position: "relative",
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    marginBottom: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  typeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 18,
  },
  location: {
    fontSize: 12,
    marginTop: 0,
    marginBottom: 4,
    lineHeight: 14,
  },
  time: {
    fontSize: 12,
    marginTop: 0,
    marginBottom: 0,
  },
  bibleRef: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  completedCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    gap: 10,
  },
  completedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  completedTitle: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  completedTime: {
    fontSize: 11,
    marginRight: 8,
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
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
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
