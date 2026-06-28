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
import { FlameSparkIcon } from "./flame-spark-icon";
import { DateTimePicker } from "./date-time-picker";
import { ScheduleProgressBar } from "./schedule-progress-bar";
import { TimeBlockCard } from "./time-block-card";
import { TimeBlockIndicator } from "./time-block-indicator";
import { AvatarPeopleSelector } from "./avatar-people-selector";
import { StackedAvatar } from "./stacked-avatar";
import { ContextMenu, type ContextMenuAction } from "./context-menu";
import { EventDetailCard } from "./event-detail-card";
import { MinistryDetailCard } from "./ministry-detail-card";
import { WorshipAlbumSelector, type WorshipAlbum } from "./worship-album-selector";
import { calculateAvailableTimeBlocks, filterExpiredTimeBlocks } from "@/lib/time-blocks";
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
import { getActiveFast, type PersonalFast } from "@/lib/prayercircle-fasting";
import { createWorshipList, WORSHIP_LISTS_KEY, addSongToList } from "@/lib/worship-list";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { DailySummaryCard } from "@/components/daily-summary-card";
import { SpotifySongCard } from "@/components/spotify-song-card";
import { EmergencyPrayersDisplay } from "@/components/emergency-prayers-display";
import { BIBLE_BOOKS, loadUnifiedBible, markChapterAsRead, getCurrentBibleDisplay, UnifiedBibleState, UNIFIED_BIBLE_KEY, getNextUnreadChapter, getCurrentBook, getBookProgress } from "@/lib/bible-unified";
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
      onPress: onEdit,
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
                {event.startTime}{event.endTime ? ` - ${event.endTime}` : ""}
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
                  {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
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
      <ContextMenu
        visible={contextMenuVisible}
        x={contextMenuPos.x}
        y={contextMenuPos.y}
        actions={contextMenuActions}
        onDismiss={() => setContextMenuVisible(false)}
      />
      <EventDetailCard
        event={event}
        people={people}
        visible={detailCardVisible}
        onClose={() => setDetailCardVisible(false)}
        onEdit={onEdit as ((updatedEvent: ScheduleEvent) => void) | undefined}
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
}: {
  todo: ScheduleTodo;
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  people?: Person[];
  events?: ScheduleEvent[];
  ministries?: ScheduleMinistry[];
  isOverdue?: boolean;
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
        <View style={[todoStyles.iconContainer, { backgroundColor: todo.isCompleted ? colors.success : (todo.color || colors.primary) }]}>
          <MaterialIcons
            name={todo.isCompleted ? "check" : (iconNameStr as any)}
            size={16}
            color="#FFFFFF"
          />
        </View>
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
          {todo.notes && (
            <Text
              style={[
                todoStyles.notes,
                { color: colors.muted },
                todo.isCompleted && { textDecorationLine: "line-through" },
              ]}
              numberOfLines={2}
            >
              {todo.notes}
            </Text>
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
      withTiming(0.4, {
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
      onPress: onEdit,
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
    shadowOpacity: glowOpacity.value * 0.6,
    shadowRadius: 12 + glowOpacity.value * 8,
    elevation: 8 + glowOpacity.value * 4,
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
                {ministry.startTime}{ministry.endTime ? ` - ${ministry.endTime}` : ""}
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
          onToggle();
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
      >
        <ReAnimated.View style={[animatedCardStyle, glowAnimatedStyle]}>
          {/* Glow effect now using shadow */}
          <View style={[ministryStyles.card, { backgroundColor: colors.surface, borderColor: ministry.color || "#7C5CFF", borderWidth: 2 }]}>
            <View style={[ministryStyles.typeTag, { backgroundColor: ministry.color || "#7C5CFF" }]}>
              <MaterialIcons name={getMinistryTypeIcon(ministry.type as any) as any} size={16} color="#FFFFFF" />
            </View>
            <Text style={[ministryStyles.title, { color: colors.foreground }, ministry.isCompleted && { textDecorationLine: "line-through", color: colors.muted }]}>
              {ministry.title}
            </Text>
            {ministry.location && (
              <Text style={[ministryStyles.location, { color: colors.muted }]} numberOfLines={1}>
                📍 {ministry.location}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 }}>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {ministry.startTime && (
                  <Text style={[ministryStyles.time, { color: colors.muted }]}>
                    {ministry.startTime}{ministry.endTime ? ` – ${ministry.endTime}` : ""}
                  </Text>
                )}
                {ministry.bibleBook && (
                  <Text style={[ministryStyles.bibleRef, { color: colors.primary, marginTop: 2 }]}>
                    📖 {ministry.bibleBook}{ministry.bibleChapter ? ` ${ministry.bibleChapter}` : ""}
                  </Text>
                )}
              </View>
              {linkedPeople.length > 0 && (
                <View style={{ paddingTop: 0 }}>
                  <StackedAvatar people={linkedPeople} size={28} />
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

  // Helper function to get last chapter read from completed Read ministries, Bible Study sessions, or Bible Study events
  const getLastChapterRead = (ministriesList: ScheduleMinistry[], bibleStudiesList: BibleStudySession[], eventsList?: ScheduleEvent[]): string => {
    console.log('DEBUG getLastChapterRead called with', bibleStudiesList.length, 'Bible studies total');
    const completedStudies = bibleStudiesList.filter((s) => s.isCompleted);
    console.log('DEBUG getLastChapterRead - found', completedStudies.length, 'completed Bible studies:', completedStudies.map(s => ({ book: s.book, chapter: s.chapter, completedAt: s.completedAt })));
    
    // Collect all completed Bible reading items from Read ministries, Bible Study sessions, and Bible Study events
    const allReadItems: Array<{ book: string; chapter: string; date: string; completedAt?: string }> = [];
    
    // Add completed Read/Bible Study ministries with Bible info
    const readMinistries = ministriesList.filter(
      (m) => m.isCompleted && (m.type === 'Read' || m.type === 'Bible Study') && m.bibleBook && m.bibleChapter
    );
    console.log('DEBUG getLastChapterRead - found', readMinistries.length, 'completed Read ministries');
    readMinistries.forEach(m => {
      allReadItems.push({
        book: m.bibleBook!,
        chapter: m.bibleChapter!,
        date: m.date,
        completedAt: m.completedAt
      });
    });
    
    // Add completed Bible Study sessions
    completedStudies.forEach(s => {
      allReadItems.push({
        book: s.book,
        chapter: s.chapter.toString(),
        date: s.date,
        completedAt: s.completedAt
      });
    });
    
    // Add completed events that contain Bible references (parse title for book/chapter)
    if (eventsList) {
      const completedEvents = eventsList.filter((e) => e.isCompleted && e.title);
      completedEvents.forEach(e => {
        const parsed = parseBibleReference(e.title);
        if (parsed) {
          allReadItems.push({
            book: parsed.book,
            chapter: parsed.chapter,
            date: e.date,
            completedAt: e.completedAt
          });
        }
      });
    }
    
    if (allReadItems.length === 0) return 'No chapters read';
    
    // Debug: log what we found
    console.log('DEBUG getLastChapterRead - all read items:', allReadItems);
    
    // Sort by completedAt (most recent first), with date as fallback
    const sorted = allReadItems.sort((a, b) => {
      const timeA = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.date).getTime();
      const timeB = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.date).getTime();
      return timeB - timeA; // Most recent first
    });
    
    console.log('DEBUG getLastChapterRead - sorted items:', sorted);
    
    const latest = sorted[0];
    console.log('DEBUG getLastChapterRead - returning:', `${latest.book} ${latest.chapter}`);
    return `${latest.book} ${latest.chapter}`;
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
          // Fallback: check for legacy book status
          const legacyBookStatus = await AsyncStorage.getItem('bibleBookStatus');
          if (legacyBookStatus) {
            const legacyStatuses = JSON.parse(legacyBookStatus);
            console.log('Found legacy book status, migrating:', legacyStatuses);
            
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
      { title: formTitle.trim(), date: formDate || selectedDate, startTime: formStartTime || undefined, color: formColor, notes: formTodoNotes || undefined },
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
    
    // If editing, update existing ministry; otherwise create new
    if (editingMinistry) {
      const updatedMinistry: ScheduleMinistry = {
        ...editingMinistry,
        title: formTitle.trim(),
        type: formMinistryType,
        date: formDate || selectedDate,
        dueDate: formDueDate || undefined,
        color: formColor,
        startTime: formStartTime || undefined,
        endTime: formEndTime || undefined,
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
        startTime: formStartTime || undefined,
        endTime: formEndTime || undefined,
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
    if (!formTitle.trim()) return;
    
    const newAlbum = {
      id: generateId(),
      title: formTitle.trim(),
      artist: formNotes.trim() || 'Unknown Artist',
      coverUrl: formAlbumCoverImage || formSongLink.trim() || '',
      spotifyUrl: formSpotifyLink.trim() || '',
      date: selectedDate,
      createdAt: new Date().toISOString(),
    };
    
    console.log('DEBUG: About to save album with date:', selectedDate, 'Album:', newAlbum);
    
    try {
      // Update state immediately with the new album
      setWorshipAlbums((prev) => {
        const updated = [...prev, newAlbum];
        console.log('DEBUG: State updated with albums:', updated);
        return updated;
      });
    } catch (error) {
      console.error('Error saving worship album:', error);
    }
    
    // Close modal and reset form after a brief delay to allow state to update
    setTimeout(() => {
      resetForm();
      setFormWorshipSongs([]);
      setAddType(null);
      setShowAddModal(false);
    }, 100);
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

    // Calculate available time blocks
    const allScheduledItems = [
      ...dayTodos.filter((t) => t.startTime && !t.isCompleted),
      ...dayEvents.filter((e) => !e.isCompleted && e.startTime),
      ...dayMinistries.filter((m) => m.startTime && !m.isCompleted),
    ];
    const availableBlocks = calculateAvailableTimeBlocks(allScheduledItems);
    const activeBlocks = filterExpiredTimeBlocks(availableBlocks, selectedDate);

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

    // Add completed Bible Study sessions
    const completedBibleStudies = dayBibleStudies.filter((bs) => bs.isCompleted);
    completedBibleStudies.forEach((bs) => items.push({ type: "bible-study", id: bs.id, data: bs }));

    // Expandable sections (bible, fasting, worship) - reordered so Personal Study comes before Worship
    // Personal Study should show CURRENT book being read, not last completed chapter
    const currentBibleDisplay = bibleState ? getCurrentBibleDisplay(bibleState) : 'No book marked as current';
    items.push({ type: "expandable-bible", id: "bible-section", data: { display: currentBibleDisplay, state: bibleState } });
    items.push({ type: "expandable-fasting", id: "fasting-section", data: activeFast });
    items.push({ type: "expandable-worship", id: "worship-section", data: null });

    return items;
  }, [dayBirthdays, dayTodos, dayEvents, dayMinistries, bibleStudies, selectedDate, activeFast, bibleState]);

  const renderItem = useCallback(
    ({ item }: { item: { type: string; id: string; data: any; isOverdue?: boolean } }) => {
      switch (item.type) {
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
              onEdit={(updatedEvent) => {
                if (updatedEvent) {
                  setEvents((prev: ScheduleEvent[]) => prev.map((e: ScheduleEvent) => e.id === updatedEvent.id ? updatedEvent : e));
                }
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
                setMinistries((prev) => prev.filter((m) => m.id !== item.data.id));
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
              onDelete={() => setBibleStudies((prev) => prev.filter((bs) => bs.id !== item.data.id))}
            />
          );
        case "expandable-worship": {
          const linkedAlbumsForDate = worshipAlbums.filter((album) => album.date === selectedDate);
          console.log('DEBUG: Filtering albums for date:', selectedDate, 'Found:', linkedAlbumsForDate.length, 'Total albums:', worshipAlbums.length);
          return (
            <ExpandableSection 
              title="Worship" 
              icon="music-note"
              rightButton={
                <Pressable
                  onPress={() => onShowWorshipAlbumForm?.(true)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                </Pressable>
              }
            >
              <WorshipAlbumSelector
              selectedDate={selectedDate}
              linkedAlbums={linkedAlbumsForDate.map((a) => ({
                id: a.id,
                title: a.title,
                artist: a.artist,
                coverUrl: a.coverUrl,
                spotifyUrl: a.spotifyUrl,
              }))}
              showAddModal={showWorshipAlbumForm}
              onShowAddModal={onShowWorshipAlbumForm}
              onAddAlbum={(album: WorshipAlbum) => {
                setWorshipAlbums((prev) => [
                  ...prev,
                  {
                    id: album.id,
                    date: selectedDate,
                    title: album.title,
                    artist: album.artist,
                    coverUrl: album.coverUrl,
                    spotifyUrl: album.spotifyUrl,
                    createdAt: new Date().toISOString(),
                  },
                ]);
              }}
              onRemoveAlbum={(albumId: string) => {
                setWorshipAlbums((prev) => prev.filter((a) => a.id !== albumId));
              }}
              />
            </ExpandableSection>
          );
        }
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
            <ExpandableSection title="Personal Study" icon="menu-book">
              {item.data?.state ? (
                <View style={{ gap: 12 }}>
                  <View>
                    <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: '600' }}>
                      {item.data.display}
                    </Text>
                    {(() => {
                      const book = Object.entries(item.data.state.bookStatuses).find(([_, status]) => status === 'current')?.[0];
                      if (book) {
                        const progress = getBookProgress(item.data.state, book);
                        return (
                          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                            {progress.read} of {progress.total} chapters read
                          </Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                      <MaterialIcons name="check" size={18} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>Mark as Read</Text>
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



      {/* Content area */}
      <ReAnimated.View style={[{ flex: 1 }]}>
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
                    // Calculate remaining free time from now until midnight
                    const allScheduledItems = [
                      ...getTodosForDate(todos, selectedDate).filter((t) => t.startTime),
                      ...getEventsForDate(events, selectedDate).filter((e) => e.startTime && e.endTime),
                      ...getMinistriesForDate(ministries, selectedDate).filter((m) => m.startTime && m.endTime),
                    ];
                    const remainingTimeResult = calculateRemainingTime(allScheduledItems, selectedDate);
                    const availableHours = remainingTimeResult.remainingHours;
                    

                    
                    return (
                      <DailySummaryCard
                        remainingTodos={getTodosForDate(todos, selectedDate).filter(t => !t.isCompleted).length}
                        remainingPrayers={memoizedSummaryData.remainingPrayers}
                        fastingStatus={memoizedSummaryData.fastingStatus}
                        budgetAmount={memoizedSummaryData.budgetAmount}
                        peopleToReach={memoizedSummaryData.peopleToReach}
                        currentBibleStudy={getLastChapterRead(ministries, bibleStudies, events)}
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
                    {selectedDate !== today && (
                      <Pressable
                        onPress={() => setSelectedDate(today)}
                        style={({ pressed }) => [scheduleStyles.backToTodayPill, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                      >
                        <MaterialIcons name="today" size={12} color="#FFFFFF" />
                        <Text style={scheduleStyles.backToTodayPillText}>Today</Text>
                      </Pressable>
                    )}
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
      {/* FAB Button with Google Calendar-style popup menu */}
      <Pressable
        onPress={() => setShowAddModal(!showAddModal)}
        style={({ pressed }) => [scheduleStyles.fab, { backgroundColor: colors.primary }, pressed && { transform: [{ scale: 0.95 }], opacity: 0.9 }]}
      >
        <MaterialIcons name={showAddModal ? "close" : "add"} size={32} color="#FFFFFF" />
      </Pressable>

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
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    marginHorizontal: 12,
    borderWidth: 1,
    position: "relative",
  },
  typeTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
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
