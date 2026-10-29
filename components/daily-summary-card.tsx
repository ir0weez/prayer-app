import { Animated, View, Text, Pressable, ScrollView, Modal } from "react-native";
import { WavyProgress } from "@/components/wavy-progress";
import { formatCoins } from "@/lib/hometown";
import { getAccentThemeDefinition, mix } from "@/lib/color-themes";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { BIT_ON_DUSK, BIT_ON_DUSK_SOFT, TERM_BG, TERM_MID, TERM_PHOS, TERM_SOFT, skinText } from "@/lib/skin-themes";
import { useEffect, useRef, useState } from "react";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { getDaysSinceLastPrayedOnDate, getIconForTodo } from "@/lib/prayercircle-data";
import { ScheduleProgressBar } from "@/components/schedule-progress-bar";
import { schedulePanelStep } from "@/lib/schedule-material";
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
  /** Bottom padding of the card; defaults to 24. Schedule passes 0 (its inner
      block already carries a 16px bottom margin). */
  bottomPadding?: number;
  /** v295: the drawing's REACH row — the people due for reach-out today.
      v297: widened to carry the fields the rotating chip needs (the same
      Person fields PrayerCheckInNotice reads). */
  reachPeople?: Array<{ id: string; name: string; lastPrayedDate?: string | null; avatarColor?: string }>;
  /** v295: the Reach out button — opens the Reach Out event editor. */
  onReachOutPress?: () => void;
  /** v295: the drawing's fast clause ("day 300 of 365 · streak 2"), when a fast is live. */
  fastLine?: string | null;
  /** v297: when provided (Schedule does), the Classic panel carries the
      day-progress bar as its LAST row, per the drawing — the bar used to
      sit below the panel. The People tab passes neither and is unchanged. */
  progressCompleted?: number;
  progressTotal?: number;
  /** v297: in the Schedule day view the fixed summary zone sits UNDER the
      scrolling sheet, which swallows its touches (see schedule-tab's
      overlay host). When this callback is provided (Schedule does), the
      Classic reach row reports its rect (relative to the card root) so
      the host can size the header block's slide to the whole zone.
      v319: the row itself renders LIVE and visible in this panel in
      every seat — the invisible layout twin is retired; this callback
      only measures the row now, it never hides it. Not provided
      elsewhere (People tab). */
  onReachRect?: (rect: { x: number; y: number; width: number; height: number }) => void;
  /** v319: the rect (card-root coordinates) of the reach row's
      "Reach out" button, reported alongside the row rect so the
      Schedule host can seat an invisible press target exactly over
      the painted button while its sheet rests at the top — the
      sheet's ScrollView spans the whole fixed zone and would
      otherwise swallow the tap. The row renders once, here; the
      host never renders a copy of it. */
  onReachButtonRect?: (rect: { x: number; y: number; width: number; height: number }) => void;
}

/**
 * v297: the drawing's REACH row (schedule-material-concepts-v32.html,
 * `.faces`, lines 544–548): a small REACH label, ONE facechip at a time —
 * Jonathan's Oct 25 ruling (one reach item at a time, rotating) — and the
 * white Reach out button right after it. The rotation is the same one his
 * PrayerCheckInNotice below the panel already runs (3200ms cadence, a
 * 220/260ms fade swap); the chip text is the notice's own wording
 * ("not reached in N days", from getDaysSinceLastPrayedOnDate) in the
 * drawing's short form. The chip's disc wears the person's own
 * avatarColor, one initial, as drawn (24px disc, 10.5px initial).
 * Exported for this card — its only render. v319: schedule-tab no
 * longer renders a copy in its overlay layer (that copy dragged
 * across the prose on its slide — his Oct 28 report); the host
 * seats only an invisible press target over the button while the
 * sheet is at rest, fed by onButtonRect below.
 */
export function SummaryReachRow({
  people: reachPeople,
  selectedDate,
  onReachOutPress,
  onButtonRect,
}: {
  people: Array<{ id: string; name: string; lastPrayedDate?: string | null; avatarColor?: string }>;
  selectedDate?: string;
  onReachOutPress?: () => void;
  /** v319: reports the "Reach out" button's rect relative to this
      row's root (the chip's width changes as the face rotates, so
      the button's seat moves — onLayout tracks it). */
  onButtonRect?: (rect: { x: number; y: number; width: number; height: number }) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    setActiveIndex(0);
  }, [reachPeople]);
  useEffect(() => {
    if (reachPeople.length <= 1) return;
    let cancelled = false;
    let fadeIn: Animated.CompositeAnimation | null = null;
    const timer = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (!finished || cancelled) return;
        setActiveIndex((current) => (current + 1) % reachPeople.length);
        fadeIn = Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true });
        fadeIn.start();
      });
    }, 3200);
    return () => {
      cancelled = true;
      clearInterval(timer);
      fadeIn?.stop();
      opacity.stopAnimation();
      opacity.setValue(1);
    };
  }, [opacity, reachPeople.length]);
  if (reachPeople.length === 0) return null;
  const person = reachPeople[activeIndex % reachPeople.length];
  const firstName = person.name.trim().split(/\s+/)[0] || person.name;
  const days = person.lastPrayedDate && selectedDate
    ? getDaysSinceLastPrayedOnDate(person.lastPrayedDate, selectedDate)
    : null;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: "800", letterSpacing: 0.9, color: "#D9CCFF" }}>REACH</Text>
      <Animated.View style={{ opacity, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingVertical: 4, paddingRight: 12, paddingLeft: 4 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: person.avatarColor || "#7C3AED", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: "#FFFFFF", fontSize: 10.5, fontWeight: "800" }}>{(firstName[0] || "?").toUpperCase()}</Text>
        </View>
        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
          {firstName}{days != null ? ` · not reached in ${days} days` : ""}
        </Text>
      </Animated.View>
      <View
        onLayout={onButtonRect ? (e) => {
          const { x, y, width, height } = e.nativeEvent.layout;
          onButtonRect({ x, y, width, height });
        } : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reach out"
          onPress={onReachOutPress}
          style={({ pressed }) => ({ backgroundColor: "#FFFFFF", borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12, opacity: pressed ? 0.75 : 1 })}
        >
          <Text style={{ color: "#5B21B6", fontSize: 11.5, fontWeight: "800" }}>Reach out</Text>
        </Pressable>
      </View>
    </View>
  );
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
  bottomPadding = 24,
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
  reachPeople = [],
  onReachOutPress,
  fastLine = null,
  progressCompleted,
  progressTotal,
  onReachRect,
  onReachButtonRect,

}: DailySummaryCardProps) {
  const colors = useColors();
  const { accentTheme } = useThemeContext();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // 8-bit (v184): this card renders directly on the dusk page (the
  // summary zone), so its inks flip to the mockup's on-dusk text —
  // #EDE8FF body, #CFC6F2 soft — instead of the palette's dark inks.
  const ink = skinTokens.isTerminal ? TERM_SOFT : skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground;
  const inkSoft = skinTokens.isTerminal ? TERM_MID : skinTokens.isEightBit ? BIT_ON_DUSK_SOFT : colors.muted;
  // v190: the summary's inline icons ride inside the paragraph
  // text, so they grow with it — 16 to match the old body, the
  // summaryBody size (18) under a scaled skin (Paper; Classic too
  // since v274).
  const summaryIconSize = skinTokens.type.summaryBody ?? 16;
  const [showDayDropdown, setShowDayDropdown] = useState(false);

  // v319: the reach row's two measures, combined into the button's
  // card-root rect for the Schedule host's press seat. The row
  // wrapper reports in panel coordinates (converted to card-root
  // with the panel's −6 / +8 seat, as onReachRect has since v297);
  // the button reports inside the row. Either can land first and
  // the button's seat moves as the facechip rotates, so both are
  // kept in refs and every layout re-emits the combination.
  const reachRowLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const reachButtonLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const emitReachButtonRect = () => {
    if (!onReachButtonRect) return;
    const row = reachRowLayoutRef.current;
    const btn = reachButtonLayoutRef.current;
    if (!row || !btn) return;
    onReachButtonRect({ x: row.x - 6 + btn.x, y: row.y + 8 + btn.y, width: btn.width, height: btn.height });
  };

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
  
  // Get time-based greeting (Jonathan's boundaries: morning 6–11, afternoon
  // 11–4, evening 4–8, night 8pm–6am)
  const getTimeBasedGreeting = () => {
    const hour = now.getHours();
    if (hour >= 6 && hour < 11) return 'Good morning';
    if (hour >= 11 && hour < 16) return 'Good afternoon';
    if (hour >= 16 && hour < 20) return 'Good evening';
    return 'Good night';
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

  // Extracted (v295) so both dresses — the legacy layout and the
  // Classic blend composition — share the one day-selector modal.
  const daySelectorModal = (
    <>
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
                  <Pressable
                    key={day.dayName}
                    onPress={() => {
                      if (onBibleStudyDayChange) {
                        onBibleStudyDayChange(day.dayName);
                      }
                      setShowDayDropdown(false);
                    }}
                    style={({ pressed }) => [{
                      marginVertical: 10,
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: colors.background,
                      borderWidth: 2,
                      borderColor: displayDay === day.dayName ? (skinTokens.isTerminal ? TERM_PHOS : colors.primary) : colors.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: pressed ? 0.7 : 1,
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16, marginBottom: 8 }}>
                        {day.dayName}: {day.book}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 8 }}>
                        {day.chapter} of {getChapterCount(day.book)} chapters
                      </Text>
                      {/* v339: the day thread wears the wavy fill
                          (his Oct 29 ruling) — same seat and colours. */}
                      <WavyProgress value={day.chapter / getChapterCount(day.book)} color={skinTokens.isTerminal ? TERM_PHOS : colors.primary} trackColor={colors.border} height={8} />
                    </View>
                    {onDeleteBibleStudyDay && (
                      <Pressable
                        onPress={() => {
                          onDeleteBibleStudyDay(day.dayName);
                          setShowDayDropdown(false);
                        }}
                        style={({ pressed }) => [{
                          marginLeft: 12,
                          opacity: pressed ? 0.5 : 1,
                        }]}
                      >
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </Pressable>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </>
  );

  // v295 (CLASSIC ONLY): the approved blend composition from the v32
  // drawing — the summary as ONE saturated card in the seed's deep
  // step: greeting with the name chip and streak badge, the prose
  // paragraph (every fact the legacy layout carries, plus the fast
  // clause), and the REACH row with the due people's faces. The
  // skins keep the legacy layout below, untouched.
  // v297: the branch is re-measured against the drawing (his Oct 27
  // verdict: "the summary doesn't match it either"): panel padding
  // 16/17/13 and a −6 side margin (the drawing's 14px page margin
  // against the strip's 20px), greeting 16px with the streak as the
  // drawing's red disc INSIDE the name chip, prose at the drawing's
  // 15/24 with no-break joins in the time and fast clauses (his
  // screenshot orphaned "2." onto its own line), the REACH row as
  // ONE rotating facechip per his Oct 25 ruling, and the progress
  // bar as the panel's last row. The reach row renders through
  // SummaryReachRow — v319: live in this panel, its only render
  // (the sheet swallows this zone's touches; the host answers with
  // a rest-only press seat over the button, not a second render).
  if (!isSkinned) {
    // v296: the panel derives from the seed's SATURATED step (the
    // accent theme's light primary) in BOTH appearances. v295 mixed
    // down from colors.primary, which under dark appearance is the
    // lightened step — so on his phone (dark) the panel rendered
    // pale lavender under white text: a different, lower-contrast
    // panel than the drawing's deep saturated one. The drawing's
    // panel is the saturated seed deepened 12%; that now holds at
    // night too. (In light appearance seedPrimary === colors.primary,
    // so the light panel is byte-identical to v295's.)
    const seedPrimary = getAccentThemeDefinition(accentTheme).light?.primary ?? colors.primary;
    // v298: the panel step is the drawing's own step, derived in HSL
    // (schedulePanelStep) — v297's 12% RGB black-mix rendered visibly
    // LIGHTER and greyer than the drawing's deep saturated panel from
    // his seed (his Oct 28 side-by-side). The greeting and prose take
    // the drawing's pale steps of the panel (its #E4DBFF / #F5F2FF
    // against #6D28D9), and the name chip its rgba(255,255,255,.16).
    const panel = schedulePanelStep(seedPrimary);
    const chipBg = mix(panel, "#FFFFFF", 0.16);
    const onPanel = "#FFFFFF";
    const onPanelSoft = mix(panel, "#FFFFFF", 0.82);
    const proseColor = mix(panel, "#FFFFFF", 0.94);
    return (
      <Animated.View
        style={{
          paddingTop: 8,
          paddingBottom: bottomPadding,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        }}
      >
        <View style={{ backgroundColor: panel, borderRadius: 24, marginHorizontal: -6, paddingHorizontal: 17, paddingTop: 16, paddingBottom: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
            <Text style={{ fontSize: 16, color: onPanelSoft, fontWeight: "500" }}>
              {getTimeBasedGreeting()},
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: chipBg, borderRadius: 11, paddingHorizontal: 11, paddingVertical: 4 }}>
              <Text style={{ fontWeight: "800", color: onPanel, fontSize: 15 }}>
                {userName}
              </Text>
              {prayerStreak > 0 && (
                <View style={{ minWidth: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#EF4444", alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                  <Text style={{ fontWeight: "800", color: "#FFFFFF", fontSize: 10.5 }}>
                    {prayerStreak}
                  </Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 16, color: onPanelSoft, fontWeight: "500" }}>.</Text>
          </View>

          <Text style={{ fontSize: 15, lineHeight: 24, color: proseColor, fontWeight: "400", marginTop: 8 }}>
            You have{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="task-alt" size={15} color={onPanel} /> {remainingTodos} todo{remainingTodos !== 1 ? "s" : ""}
            </Text>
            , last{' '}
            {bibleStudyDays.length > 0 ? (
              <Text
                onPress={() => setShowDayDropdown(true)}
                style={{
                  fontWeight: "800",
                  color: proseColor,
                  textDecorationLine: "underline",
                  textDecorationStyle: "dashed",
                  textDecorationColor: "rgba(255,255,255,0.6)",
                }}
              >
                {displayDay}
              </Text>
            ) : (
              <Text style={{ fontWeight: "800" }}>{displayDay}</Text>
            )}
            {' '}bible study{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="school" size={15} color={onPanel} /> {currentBibleStudy || 'none'}
            </Text>
            , have{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="favorite" size={15} color={onPanel} /> {remainingPrayers} prayer{remainingPrayers !== 1 ? "s" : ""}
            </Text>
            , <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="account-balance-wallet" size={15} color={onPanel} /> ${formatCoins(budgetAmount)}
            </Text> to budget,{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="people" size={15} color={onPanel} /> {peopleToReach} people
            </Text> to reach, {' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="event" size={15} color={onPanel} /> {eventCount} event{eventCount !== 1 ? "s" : ""}
            </Text>, and{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="volunteer-activism" size={15} color={onPanel} /> {ministryCount} ministries
            </Text> to lead. You have{' '}
            <Text style={{ fontWeight: "800" }}>
              <MaterialIcons name="schedule" size={15} color={onPanel} /> {availableTimeString.replace(" ", "\u00A0")}
            </Text>{' '}available.
            {fastLine ? (
              <Text>
                {' '}Your fast —{' '}
                <Text style={{ fontWeight: "800" }}>
                  <MaterialIcons name="local-fire-department" size={15} color={onPanel} /> {fastLine}
                </Text>.
              </Text>
            ) : null}
          </Text>

          {reachPeople.length > 0 && (
            // v319: the ONE render of the reach row — live and
            // visible in the panel in every seat. (v297–v318 this
            // seat held an invisible layout twin while a second,
            // live copy rode the overlay's header slide; on his
            // phone that copy dragged across the prose above it —
            // his Oct 28 report — so the copy is gone. The wrapper
            // only MEASURES now: the row rect sizes the header
            // block's slide, and the button rect seats the host's
            // rest-only press target over the painted button.)
            <View
              style={{ marginTop: 12 }}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                reachRowLayoutRef.current = { x, y, width, height };
                onReachRect?.({ x: x - 6, y: y + 8, width, height });
                emitReachButtonRect();
              }}
            >
              <SummaryReachRow
                people={reachPeople}
                selectedDate={selectedDate}
                onReachOutPress={onReachOutPress}
                onButtonRect={(rect) => {
                  reachButtonLayoutRef.current = rect;
                  emitReachButtonRect();
                }}
              />
            </View>
          )}

          {progressTotal != null && (
            <View style={{ marginTop: 14 }}>
              <ScheduleProgressBar variant="panel" completed={progressCompleted ?? 0} total={progressTotal} />
            </View>
          )}
        </View>

        {daySelectorModal}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={{
        paddingHorizontal: 24 + skinTokens.type.padBoost,
        paddingTop: 16 + skinTokens.type.gapBoost,
        paddingBottom: bottomPadding,
        transform: [{ translateY: slideAnim }],
        opacity: opacityAnim,
      }}
    >
      {/* Summary with greeting and profile badge */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          <Text style={{ fontSize: 18, color: inkSoft, fontWeight: "500", ...skinText(skinTokens, skinTokens.type.greeting) }}>
            {getTimeBasedGreeting()}, 
          </Text>
          
          {/* Profile Badge */}
          <View
            style={[{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: (skinTokens.isEightBit || skinTokens.isTerminal) ? 2 : 12,
              // Terminal (v188): the name chip is the mockup's inverted
              // selection block — phosphor face, tube-dark text — not
              // the palette's fasting-status badge color (which read as
              // a purple straggler on the tube).
              backgroundColor: skinTokens.isTerminal ? TERM_PHOS : getBadgeColor(),
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginLeft: 4,
            }, null]}
          >
            <Text style={[{ fontWeight: "700", color: skinTokens.isTerminal ? TERM_BG : "#FFFFFF", fontSize: 16, ...skinText(skinTokens, skinTokens.type.summaryName) }, null]}>
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
          <Text style={{ fontSize: 18, color: inkSoft, fontWeight: "500", marginLeft: 4, ...skinText(skinTokens, skinTokens.type.greeting) }}>.</Text>
        </View>

        {/* Summary text */}
        <Text style={{ fontSize: 16, lineHeight: 24, color: ink, fontWeight: "400", ...skinText(skinTokens, skinTokens.type.summaryBody, skinTokens.type.summaryLineHeight) }}>
          You have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="task-alt" size={summaryIconSize} color={ink} /> {remainingTodos} todo{remainingTodos !== 1 ? "s" : ""}
          </Text>
          , last{' '}
          {bibleStudyDays.length > 0 ? (
            <Text
              onPress={() => setShowDayDropdown(true)}
              style={{
                fontWeight: "700",
                color: ink,
                textDecorationLine: "underline",
                textDecorationStyle: "dashed",
                textDecorationColor: skinTokens.isTerminal ? TERM_MID : colors.primary,
              }}
            >
              {displayDay}
            </Text>
          ) : (
            <Text style={{ fontWeight: "700" }}>{displayDay}</Text>
          )}
          {' '}bible study{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="school" size={summaryIconSize} color={ink} /> {currentBibleStudy || 'none'}
          </Text>
          , have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="favorite" size={summaryIconSize} color={ink} /> {remainingPrayers} prayer{remainingPrayers !== 1 ? "s" : ""}
          </Text>
          , <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="account-balance-wallet" size={summaryIconSize} color={ink} /> ${formatCoins(budgetAmount)}
          </Text> to budget,{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="people" size={summaryIconSize} color={ink} /> {peopleToReach} people
          </Text> to reach, {' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="event" size={summaryIconSize} color={ink} /> {eventCount} event{eventCount !== 1 ? "s" : ""}
          </Text>, and{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="volunteer-activism" size={summaryIconSize} color={ink} /> {ministryCount} ministries
          </Text> to lead. You have{' '}
          <Text style={{ fontWeight: "700" }}>
            <MaterialIcons name="schedule" size={summaryIconSize} color={ink} /> {availableTimeString}
          </Text>{' '}available.
        </Text>
      </View>

{daySelectorModal}

    </Animated.View>
  );
}
