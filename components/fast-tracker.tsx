import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View, type ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { PeopleFrontDoorFamily } from "@/lib/people-material";
import {
  FAST_KEPT,
  FAST_KEPT_DEEP,
  FAST_MISSED_DEEP,
  FAST_MISSED_WASH,
  FAST_SKIPPED_DEEP,
  FAST_SKIPPED_WASH,
  formatRecapWeekLabel,
  getFastCalendarWeeks,
  getFastEncouragement,
  getFastNoteStream,
  getFastRecordWeeks,
  getFastWeekKeptLabel,
  type FastRecap,
  type FastRecapWeek,
  type FastWeek,
  type RecapBlock,
  type RecapBlockRow,
  type RecapEncouragement,
} from "@/lib/fast-tracker";
import { WavyProgress } from "@/components/wavy-progress";
import {
  getFastCalendarDays,
  getFastProgress,
  type FastDayStatus,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";

/**
 * v276 "The Fast, As a Tracker" — the fasting page's new surfaces,
 * copied from the approved mockup
 * (social-mockups/fasting-tracker-design-v3.html, Jonathan 2026-10-26:
 * "Okay let's make the fasting page like this.").
 *
 * Dress: Material, derived from the Settings seed × appearance via
 * the People front-door family (derivePeopleFrontDoor) — never pinned
 * to the mockup's violet; under skins it follows the Bible precedent
 * (Material dress seeded from Settings). Meaning colors (kept green,
 * skipped amber, missed red) are constants and never follow the seed.
 *
 * These are pure presentation components: every write goes back
 * through profile.tsx's engine callbacks (setFastStatus & friends),
 * so XP/hearts/coins side effects and storage stay exactly where
 * they have always lived.
 *
 * v280 (Jonathan, Oct 26 19:00–19:01: "Why would we keep it? …
 * Everything else should be done in the approved material design
 * mockup."): the board game layer is DELETED, not unmounted —
 * components/fast-board.tsx, components/pawn-mood-scene.tsx and
 * lib/fast-pawns.ts are gone, board specials no longer pay out
 * anywhere, and this page conforms to the mockup exactly (Record
 * on the container tone, no quarter caption, no Clear-mark button
 * — re-tapping the selected segment unmarks — no See-all row, the
 * day sheet's sub carries no date). Two fast-core readers that
 * lived in the board file moved here so the People page's fasting
 * card survives the deletion untouched: FastFlame and
 * FastSummaryCard (their model, getPreviousFast, moved to
 * lib/fast-tracker.ts).
 */

export type FastTrackerFamily = PeopleFrontDoorFamily;

const STATUS_LABEL: Record<FastDayStatus, string> = {
  completed: "Complete",
  skipped: "Skipped",
  missed: "Missed",
};

const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function weekdayName(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : WEEKDAY_NAMES[parsed.getUTCDay()];
}

function weekdayShort(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? "" : WEEKDAY_SHORT[parsed.getUTCDay()];
}

function statusTagColor(family: FastTrackerFamily, status?: FastDayStatus): string {
  if (status === "completed") return "#1E9E6A";
  if (status === "skipped") return family.amberDeep;
  if (status === "missed") return FAST_MISSED_DEEP;
  return family.inkSoft;
}

// ─── Segmented control (M3: 40px, outline group, check on selected) ──
type SegmentedOption<T extends string> = { value: T; label: string };

function FastSegmentedControl<T extends string>(props: {
  family: FastTrackerFamily;
  options: SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T, position?: { x: number; y: number }) => void;
  onHero?: boolean;
  /** Per-value selected paints (the day sheet: Missed wears the error container). */
  selectedPaints?: Partial<Record<T, { backgroundColor: string; color: string }>>;
  style?: ViewStyle;
}) {
  const { family, options, value, onChange, onHero, selectedPaints, style } = props;
  return (
    <View
      style={[
        styles.seg,
        onHero
          ? { borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.10)" }
          : { borderColor: family.line, backgroundColor: family.card },
        style,
      ]}
    >
      {options.map((option, index) => {
        const selected = value === option.value;
        const paint = selectedPaints?.[option.value];
        const selectedStyle = onHero
          ? { backgroundColor: "#FFFFFF" }
          : paint
            ? { backgroundColor: paint.backgroundColor }
            : { backgroundColor: family.wash2 };
        const labelColor = onHero
          ? selected
            ? family.seed
            : "#FFFFFF"
          : selected
            ? (paint?.color ?? family.deep)
            : family.ink;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={(event) => onChange(option.value, { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY })}
            style={[
              styles.segItem,
              index < options.length - 1 && {
                borderRightWidth: 1,
                borderRightColor: onHero ? "rgba(255,255,255,0.32)" : family.line,
              },
              selected && selectedStyle,
            ]}
          >
            {selected && (
              <MaterialIcons name="check" size={18} color={onHero ? family.seed : (paint?.color ?? family.deep)} />
            )}
            <Text style={[styles.segLabel, { color: labelColor }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const STATUS_OPTIONS: SegmentedOption<FastDayStatus>[] = [
  { value: "completed", label: "Complete" },
  { value: "skipped", label: "Skipped" },
  { value: "missed", label: "Missed" },
];

// ─── 1 · The Why card ────────────────────────────────────────────────
export function FastWhyCard(props: { family: FastTrackerFamily; fast: PersonalFast; onEdit: () => void }) {
  const { family, fast, onEdit } = props;
  const why = fast.why?.trim();
  return (
    <View style={[styles.card, styles.cardShadowless, { backgroundColor: family.wash2 }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.kicker, { color: family.deep }]}>WHY I&rsquo;M FASTING</Text>
        <Pressable onPress={onEdit} hitSlop={8} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: family.deep }]}>{why ? "Edit" : "Add"}</Text>
        </Pressable>
      </View>
      {why ? (
        <Text style={[styles.whyText, { color: family.ink }]}>{why}</Text>
      ) : (
        <Pressable onPress={onEdit}>
          <Text style={[styles.whyEmpty, { color: family.washSub }]}>
            Add why you&rsquo;re fasting — it stands at the top of this page, and your recaps quote it back to you.
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── 2 · The Today hero ──────────────────────────────────────────────
export function FastTodayHero(props: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  today: string;
  onMark: (status: FastDayStatus, position?: { x: number; y: number }) => void;
  onOpenDay: (date: string) => void;
}) {
  const { family, fast, today, onMark, onOpenDay } = props;
  const days = getFastCalendarDays(fast);
  const todayIndex = days.indexOf(today);
  const dayNumber = todayIndex >= 0 ? todayIndex + 1 : today < fast.startDate ? 0 : fast.durationDays;
  const fraction = fast.durationDays > 0 ? Math.min(Math.max(dayNumber / fast.durationDays, 0), 1) : 0;
  const pct = Math.round(fraction * 100);
  const todayStatus = fast.dayStatuses[today];
  const circumference = 2 * Math.PI * 50;
  return (
    <View style={[styles.hero, { backgroundColor: family.seed, shadowColor: family.deep }]}>
      <Text style={styles.heroKicker}>TODAY</Text>
      <View style={styles.heroTop}>
        <Pressable onPress={() => onOpenDay(today)} style={styles.ringWrap} accessibilityRole="button" accessibilityLabel="Open today">
          <Svg width={118} height={118} viewBox="0 0 118 118">
            <Circle cx={59} cy={59} r={50} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={10} />
            <Circle
              cx={59}
              cy={59}
              r={50}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              transform="rotate(-90 59 59)"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={styles.ringPct}>{pct}%</Text>
            <Text style={styles.ringOf}>OF THE FAST</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => onOpenDay(today)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel="Open today">
          <Text style={styles.heroDay}>
            Day {Math.max(dayNumber, 1)} <Text style={styles.heroDayOf}>of {fast.durationDays}</Text>
          </Text>
          <Text style={styles.heroSub}>
            {todayStatus
              ? `Marked ${STATUS_LABEL[todayStatus]} today.`
              : "Today isn’t marked yet.\nHow did today go?"}
          </Text>
        </Pressable>
      </View>
      <FastSegmentedControl
        family={family}
        options={STATUS_OPTIONS}
        value={todayStatus ?? null}
        onHero
        style={{ marginTop: 18 }}
        onChange={(status, position) => {
          // One tap marks; tapping the standing mark reopens the day
          // sheet to change it (the mockup's hero note).
          if (status === todayStatus) onOpenDay(today);
          else onMark(status, position);
        }}
      />
      <Text style={styles.heroNote}>One tap marks the day. Tap it again any time to change it.</Text>
    </View>
  );
}

// ─── 3 · The Record ──────────────────────────────────────────────────
export function FastRecordCard(props: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  today: string;
  weeks: FastWeek[];
  quarters: { index: number; label: string; monthRange: string; startDay: number; endDay: number }[] | null;
  activeQuarter: number;
  onQuarterChange: (index: number) => void;
  onOpenDay: (date: string) => void;
}) {
  const { family, fast, today, weeks, quarters, activeQuarter, onQuarterChange, onOpenDay } = props;
  const notes = getFastNoteStream(fast, 3);
  // v283: the Record shows the weeks that have begun, current week
  // first (the model's ruling) — v280 reversed ALL of the quarter's
  // weeks, so Q4 opened on Week 53 stamped "0 of 7 kept".
  const shownWeeks = getFastRecordWeeks(weeks);
  return (
    <View style={[styles.card, { backgroundColor: family.container, shadowColor: family.shadow }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.kicker, { color: family.deep }]}>THE RECORD</Text>
        <Text style={[styles.cardHeadSub, { color: family.inkSoft }]}>Weeks · notes · recaps</Text>
      </View>

      {quarters ? (
        <View style={{ marginTop: 12 }}>
          <FastSegmentedControl
            family={family}
            options={quarters.map((q) => ({ value: String(q.index), label: q.label }))}
            value={String(activeQuarter)}
            onChange={(value) => onQuarterChange(Number(value))}
          />
        </View>
      ) : null}

      {shownWeeks.map((week) => {
        // The kept label is the model's now (v283): null for a week
        // that has not begun — those rows (a future quarter tapped
        // into) stand on their ahead dots alone, no count spoken.
        const keptLabel = getFastWeekKeptLabel(week);
        const keptSuffix = keptLabel?.endsWith(" so far") ? " so far" : " kept";
        const keptBold = keptLabel ? keptLabel.slice(0, keptLabel.length - keptSuffix.length) : null;
        return (
        <View key={week.startDate} style={[styles.weekRow, { borderBottomColor: family.line }]}>
          <View style={styles.weekMeta}>
            <View style={{ flexDirection: "row", alignItems: "baseline", flex: 1 }}>
              {/* v342 (amendment #6): the row is titled by its calendar
                  dates like the recap — weeks run Sunday–Saturday,
                  never 7-day blocks from the fast's start. */}
              <Text style={[styles.weekTitle, { color: family.ink }]}>{formatRecapWeekLabel(week.startDate, week.endDate)}</Text>
              <Text style={[styles.weekDates, { color: family.inkSoft }]}>
                Days {week.days[0].dayNumber}–{week.days[week.days.length - 1].dayNumber}
                {week.current ? " · this week" : ""}
              </Text>
            </View>
            {keptLabel ? (
              <Text style={[styles.weekKept, { color: family.inkSoft }]}>
                <Text style={{ color: FAST_KEPT_DEEP, fontWeight: "600" }}>{keptBold}</Text>
                {keptSuffix}
              </Text>
            ) : null}
          </View>
          <View style={styles.dots}>
            {week.days.map((day) => {
              const isToday = day.date === today;
              const dotStyle = isToday
                ? { backgroundColor: family.wash, borderWidth: 2, borderColor: family.seed }
                : day.status === "completed"
                  ? { backgroundColor: FAST_KEPT }
                  : day.status === "skipped"
                    ? { backgroundColor: FAST_SKIPPED_WASH }
                    : day.status === "missed"
                      ? { backgroundColor: FAST_MISSED_WASH }
                      : { borderWidth: 1.5, borderColor: family.line };
              const numColor = isToday
                ? family.deep
                : day.status === "completed"
                  ? "#FFFFFF"
                  : day.status === "skipped"
                    ? FAST_SKIPPED_DEEP
                    : day.status === "missed"
                      ? FAST_MISSED_DEEP
                      : family.inkSoft;
              const dot = (
                <Pressable
                  onPress={() => onOpenDay(day.date)}
                  style={[styles.dot, dotStyle]}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day.dayNumber}${day.status ? `, ${STATUS_LABEL[day.status]}` : ""}`}
                >
                  <Text style={[styles.dotNum, { color: numColor }]}>{day.dayNumber}</Text>
                </Pressable>
              );
              // The mockup rings today with a 3px wash2 halo — an
              // absolute ring behind the dot, so the row's columns
              // never shift.
              return (
                <View key={day.date} style={styles.dotCell}>
                  {isToday && <View style={[styles.dotHalo, { backgroundColor: family.wash2 }]} />}
                  {dot}
                </View>
              );
            })}
          </View>
          {week.current ? (
            <View style={styles.dots}>
              {week.days.map((day) => (
                <Text key={day.date} style={[styles.dotLabel, { color: family.inkSoft }]}>
                  {weekdayShort(day.date)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        );
      })}

      {notes.length > 0 && (
        <View style={{ marginTop: 6 }}>
          {notes.map((entry) => (
            <Pressable
              key={entry.date}
              onPress={() => onOpenDay(entry.date)}
              style={[styles.listRow, { borderBottomColor: family.line }]}
            >
              <View style={[styles.dayBadge, { backgroundColor: family.wash }]}>
                <Text style={[styles.dayBadgeNum, { color: family.deep }]}>{entry.dayNumber}</Text>
                <Text style={[styles.dayBadgeCap, { color: family.inkSoft }]}>DAY</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.stateTag, { color: statusTagColor(family, entry.status) }]}>
                  {entry.status ? STATUS_LABEL[entry.status].toUpperCase() : "NOTE"}
                </Text>
                <Text style={[styles.noteText, { color: family.ink }]} numberOfLines={2}>
                  {entry.note}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── 5 · Recaps ──────────────────────────────────────────────────────
/** Who the Recaps card / document is showing: a CALENDAR week (by
 *  its Sunday startDate) or the whole fast — v342: recap weeks are
 *  Sun–Sat calendar weeks named by their dates, never fast-block
 *  numbers (his ruling, Oct 29). */
export type FastRecapTarget = { kind: "week"; startDate: string } | { kind: "final" };

export function FastRecapsCard(props: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  /** v342: the CALENDAR weeks (getFastRecapWeeks) — the Record
   *  card keeps the fast-block weeks; recaps live on the calendar. */
  recapWeeks: FastRecapWeek[];
  finalReady: boolean;
  onOpenRecap: (target: FastRecapTarget) => void;
}) {
  const { family, recapWeeks, finalReady, fast, onOpenRecap } = props;
  const currentWeek = recapWeeks.find((w) => w.current);
  const availableWeeks = recapWeeks.filter((w) => w.available);
  // The card's set (v280 shape, v342 data): the pending week, the
  // most recent presented week, and the Final recap.
  const latestWeek = availableWeeks[availableWeeks.length - 1];
  return (
    <View style={[styles.card, styles.cardFlush, { backgroundColor: family.card, shadowColor: family.shadow }]}>
      <View style={[styles.cardBand, { backgroundColor: family.wash }]}>
        <Text style={[styles.kicker, { color: family.deep }]}>RECAPS</Text>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        {currentWeek && !currentWeek.available && !finalReady ? (
          <View style={[styles.listRow, { borderBottomColor: family.line }]}>
            <View style={[styles.leadCircle, { backgroundColor: family.wash }]}>
              <MaterialIcons name="description" size={20} color={family.deep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: family.ink }]}>
                {formatRecapWeekLabel(currentWeek.startDate, currentWeek.endDate)} recap
              </Text>
              <Text style={[styles.rowSub, { color: family.inkSoft }]}>Arrives Saturday</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
          </View>
        ) : null}
        {latestWeek ? (
          <Pressable
            onPress={() => onOpenRecap({ kind: "week", startDate: latestWeek.startDate })}
            style={[styles.listRow, { borderBottomColor: family.line }]}
          >
            <View style={[styles.leadCircle, { backgroundColor: family.wash }]}>
              <MaterialIcons name="description" size={20} color={family.deep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: family.ink }]}>
                {formatRecapWeekLabel(latestWeek.startDate, latestWeek.endDate)} recap
              </Text>
              <Text style={[styles.rowSub, { color: family.inkSoft }]}>
                {latestWeek.kept} kept · {latestWeek.skipped} skipped · {latestWeek.missed} missed
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => finalReady && onOpenRecap({ kind: "final" })}
          style={[styles.listRow, { borderBottomColor: "transparent" }]}
        >
          <View style={[styles.leadCircle, { backgroundColor: "#FFF3D6" }]}>
            <MaterialIcons name="star" size={20} color="#B26E12" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: family.ink }]}>Final recap — your {fast.durationDays} days</Text>
            <Text style={[styles.rowSub, { color: family.inkSoft }]}>
              {finalReady ? "Your fast, in your words" : `Crowns the fast on Day ${fast.durationDays}`}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── 4 · The day sheet ───────────────────────────────────────────────
export function FastDaySheetContent(props: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  date: string;
  onSave: (status: FastDayStatus | null, note: string) => void;
  onClose: () => void;
}) {
  const { family, fast, date, onSave, onClose } = props;
  const days = getFastCalendarDays(fast);
  const dayNumber = days.indexOf(date) + 1;
  // v342 (amendment #6): the day sheet's week is the CALENDAR week
  // (Sun–Sat) holding the day — the same index the Record and the
  // Recaps count by, not a 7-day block from the fast's start.
  const weekNumber =
    dayNumber > 0 ? getFastCalendarWeeks(fast).findIndex((w) => w.startDate <= date && date <= w.endDate) + 1 : 0;
  const [status, setStatus] = useState<FastDayStatus | null>(fast.dayStatuses[date] ?? null);
  const [note, setNote] = useState(fast.dailyNotes?.[date] ?? "");
  const encouragement = getFastEncouragement(status ?? undefined);
  return (
    <View>
      <View style={[styles.handle, { backgroundColor: family.wash2 }]} />
      <Text style={[styles.sheetTitle, { color: family.ink }]}>Day {dayNumber}</Text>
      <Text style={[styles.sheetSub, { color: family.inkSoft }]}>
        {weekdayName(date)} · Week {weekNumber} of the fast
      </Text>

      <View style={{ marginTop: 16 }}>
        <FastSegmentedControl
          family={family}
          options={STATUS_OPTIONS}
          value={status}
          // The mockup's sheet carries no Clear-mark button: tapping
          // the standing segment again unmarks the day (v280).
          onChange={(next) => setStatus(next === status ? null : next)}
          selectedPaints={{
            missed: { backgroundColor: FAST_MISSED_WASH, color: FAST_MISSED_DEEP },
            skipped: { backgroundColor: FAST_SKIPPED_WASH, color: FAST_SKIPPED_DEEP },
          }}
        />
      </View>

      <View style={[styles.field, { borderColor: family.inkSoft }]}>
        <Text style={[styles.fieldLabel, { backgroundColor: family.card, color: family.deep }]}>Note for this day</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Why did this day go the way it went?"
          placeholderTextColor={family.inkSoft}
          multiline
          style={[styles.fieldInput, { color: family.ink }]}
        />
      </View>

      <View style={[styles.encourage, { backgroundColor: family.wash }]}>
        <Text style={[styles.encourageKicker, { color: family.washSub }]}>{encouragement.kicker}</Text>
        <Text style={[styles.encourageText, { color: family.ink }]}>&ldquo;{encouragement.text}&rdquo;</Text>
        <Text style={[styles.encourageRef, { color: family.inkSoft }]}>{encouragement.ref}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onClose} style={styles.textButton}>
          <Text style={[styles.textButtonLabel, { color: family.deep }]}>Cancel</Text>
        </Pressable>
        <Pressable onPress={() => onSave(status, note)} style={[styles.filledButton, { backgroundColor: family.seed }]}>
          <Text style={styles.filledButtonLabel}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── 5b · The recap document ─────────────────────────────────────────
/* ─── The recap document (v342) ───────────────────────────────────
   Built to the approved drawing (weekly-recap-concepts-v5.html,
   Jonathan Oct 29: "Love it, do it"): an expressive large-title
   header; a tonal hero carrying the week's shape as the travelling
   wavy thread; shaped stat tiles (Kept a rounded square, Skipped a
   circle, Missed a pill, the longest held stretch an arch); Highs
   and Lows as material list blocks with shape markers and quote
   rows; a filled encouragement surface with its verse anchor; real
   Material buttons; and the Week Ahead companion below. Every
   surface derives from the seed family (Settings palette ×
   appearance) — no cream, no pinned drawing hexes. The composition
   itself lives in lib/fast-tracker.ts (composeWeeklyRecap); this
   is its rendering only. */

function RecapSegmentsText({
  segments,
  family,
  fontSize = 14.5,
}: {
  segments: { text: string; bold?: boolean }[];
  family: FastTrackerFamily;
  fontSize?: number;
}) {
  return (
    <Text style={{ color: family.ink, fontSize, lineHeight: 22 }}>
      {segments.map((s, i) => (
        <Text key={i} style={s.bold ? { fontWeight: "800" } : undefined}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

function RecapStatTile({
  shape,
  value,
  label,
  backgroundColor,
  family,
}: {
  shape: "square" | "circle" | "pill" | "arch";
  value: number;
  label: string;
  backgroundColor: string;
  family: FastTrackerFamily;
}) {
  const radii =
    shape === "arch"
      ? { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }
      : shape === "square"
        ? { borderRadius: 16 }
        : { borderRadius: 999 };
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingTop: shape === "arch" ? 16 : 12,
          paddingBottom: 12,
          paddingHorizontal: 4,
          backgroundColor,
        },
        radii,
      ]}
    >
      <Text style={{ color: family.inkSeed, fontSize: 28, lineHeight: 32, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: family.washSub, fontSize: 10, lineHeight: 13, fontWeight: "800", letterSpacing: 1.1, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function RecapBlockView({ block, family }: { block: RecapBlock; family: FastTrackerFamily }) {
  const tonal = block.tone === "tonal";
  return (
    <View
      style={{
        backgroundColor: tonal ? family.container : family.card,
        borderWidth: tonal ? 0 : 1,
        borderColor: family.line,
        borderRadius: 24,
        padding: 18,
        marginTop: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 4 }}>
        {block.marker === "diamond" ? (
          <View style={{ width: 11, height: 11, backgroundColor: family.washSub, transform: [{ rotate: "45deg" }] }} />
        ) : (
          <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 2.5, borderColor: family.seed }} />
        )}
        <Text style={{ color: family.washSub, fontSize: 11.5, fontWeight: "800", letterSpacing: 1.6 }}>{block.title}</Text>
      </View>
      {block.rows.map((row, i) => (
        <RecapRowView key={i} row={row} tonal={tonal} family={family} first={i === 0} />
      ))}
    </View>
  );
}

function RecapRowView({
  row,
  tonal,
  family,
  first,
}: {
  row: RecapBlockRow;
  tonal: boolean;
  family: FastTrackerFamily;
  first: boolean;
}) {
  if (row.kind === "quote") {
    return (
      <View
        style={{
          borderLeftWidth: 3,
          borderLeftColor: tonal ? family.washSub : family.seed,
          paddingLeft: 12,
          marginTop: first ? 10 : 14,
          marginLeft: 5,
        }}
      >
        <Text style={{ color: family.washSub, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8 }}>{row.whenLabel.toUpperCase()}</Text>
        <Text style={{ color: family.ink, fontSize: 14.5, lineHeight: 22, fontStyle: "italic", marginTop: 3 }}>“{row.text}”</Text>
      </View>
    );
  }
  if (row.kind === "date") {
    const tileRadii =
      row.shape === "arch"
        ? { borderTopLeftRadius: 999, borderTopRightRadius: 999, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }
        : row.shape === "circle"
          ? { borderRadius: 999 }
          : { borderRadius: 10 };
    return (
      <View style={{ flexDirection: "row", gap: 13, marginTop: first ? 10 : 14, alignItems: "flex-start" }}>
        <View style={{ alignItems: "center", width: 44 }}>
          <View
            style={[
              {
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: row.shape === "square" ? family.container : family.wash2,
              },
              tileRadii,
            ]}
          >
            <Text style={{ color: family.deep, fontSize: 17, fontWeight: "800" }}>{row.dayOfMonth}</Text>
          </View>
          <Text style={{ color: family.washSub, fontSize: 9, fontWeight: "800", letterSpacing: 0.7, marginTop: 4 }}>
            {row.weekday.slice(0, 3).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, paddingTop: 2 }}>
          <RecapSegmentsText segments={row.segments} family={family} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 11, marginTop: first ? 10 : 14, alignItems: "flex-start" }}>
      {tonal ? (
        <View style={{ width: 9, height: 9, backgroundColor: family.washSub, transform: [{ rotate: "45deg" }], marginTop: 6 }} />
      ) : (
        <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 2.5, borderColor: family.washSub, marginTop: 5 }} />
      )}
      <View style={{ flex: 1 }}>
        <RecapSegmentsText segments={row.segments} family={family} />
      </View>
    </View>
  );
}

function RecapEncouragementView({ encouragement, family }: { encouragement: RecapEncouragement; family: FastTrackerFamily }) {
  return (
    <View style={{ backgroundColor: family.seed, borderRadius: 24, padding: 20, marginTop: 14 }}>
      {encouragement.paragraphs.map((paragraph, i) => (
        <Text key={i} style={{ color: "#FFFFFF", fontSize: 14.5, lineHeight: 22, marginTop: i === 0 ? 0 : 10 }}>
          {paragraph}
        </Text>
      ))}
      <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 14.5, lineHeight: 22, fontStyle: "italic", marginTop: 12 }}>
        “{encouragement.verse.text}”
      </Text>
      <Text style={{ color: "#FFFFFF", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.8, marginTop: 6 }}>
        {encouragement.verse.ref.toUpperCase()} · KJV
      </Text>
    </View>
  );
}

export function FastRecapDocument(props: {
  family: FastTrackerFamily;
  recap: FastRecap;
  saved: boolean;
  onSaveToJournal: () => void;
  onClose: () => void;
}) {
  const { family, recap, saved, onSaveToJournal, onClose } = props;
  const ahead = recap.weekAhead;
  return (
    <View>
      <Text style={{ color: family.washSub, fontSize: 11, fontWeight: "800", letterSpacing: 2.2 }}>
        {recap.kind === "final" ? "FINAL RECAP" : "WEEKLY RECAP"}
      </Text>
      <Text style={{ color: family.inkSeed, fontSize: 34, lineHeight: 40, fontWeight: "800", marginTop: 8 }}>{recap.heroDates}</Text>
      <Text style={{ color: family.deep, fontSize: 13.5, fontWeight: "600", marginTop: 5 }}>{recap.heroFastLine}</Text>

      {/* The hero: the week's shape on the wash, its kept fraction
          as the wavy thread. */}
      <View style={{ backgroundColor: family.wash, borderRadius: 28, padding: 22, marginTop: 18 }}>
        <Text style={{ color: family.inkSeed, fontSize: 21, lineHeight: 27, fontWeight: "800" }}>{recap.heroLine}</Text>
        <Text style={{ color: family.deep, fontSize: 13.5, lineHeight: 20, marginTop: 6 }}>{recap.heroSub}</Text>
        <View style={{ marginTop: 14 }}>
          <WavyProgress value={recap.heroFraction} color={family.seed} trackColor={family.wash2} height={10} />
        </View>
      </View>

      {/* The shaped stat tiles. */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        <RecapStatTile shape="square" value={recap.counts.kept} label="KEPT" backgroundColor={family.container} family={family} />
        <RecapStatTile shape="circle" value={recap.counts.skipped} label="SKIPPED" backgroundColor={family.container} family={family} />
        <RecapStatTile shape="pill" value={recap.counts.missed} label="MISSED" backgroundColor={family.container} family={family} />
        <RecapStatTile
          shape="arch"
          value={recap.longestStreak ?? 0}
          label="DAY STREAK"
          backgroundColor={family.wash2}
          family={family}
        />
      </View>

      {recap.blocks.map((block) => (
        <RecapBlockView key={block.title} block={block} family={family} />
      ))}

      <RecapEncouragementView encouragement={recap.encouragement} family={family} />

      {/* Real Material buttons (the drawing's pair). */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 18 }}>
        <Pressable
          onPress={onSaveToJournal}
          disabled={saved}
          style={{
            flex: 1,
            height: 52,
            borderRadius: 999,
            backgroundColor: saved ? family.wash2 : family.seed,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <MaterialIcons name={saved ? "check" : "bookmark-outline"} size={19} color={saved ? family.deep : "#FFFFFF"} />
          <Text style={{ color: saved ? family.deep : "#FFFFFF", fontSize: 14.5, fontWeight: "700" }}>
            {saved ? "Saved to Journal" : "Save to Journal"}
          </Text>
        </Pressable>
        <Pressable
          onPress={onClose}
          style={{
            height: 52,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: family.container,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: family.deep, fontSize: 14.5, fontWeight: "700" }}>Close</Text>
        </Pressable>
      </View>

      {/* The Week Ahead companion — same surface, below the recap. */}
      {ahead ? (
        <View style={{ marginTop: 30 }}>
          <Text style={{ color: family.washSub, fontSize: 11, fontWeight: "800", letterSpacing: 2.2 }}>THE WEEK AHEAD</Text>
          <Text style={{ color: family.inkSeed, fontSize: 27, lineHeight: 33, fontWeight: "800", marginTop: 8 }}>{ahead.heroDates}</Text>
          {ahead.fastLine ? (
            <Text style={{ color: family.deep, fontSize: 13, fontWeight: "600", marginTop: 5 }}>{ahead.fastLine}</Text>
          ) : null}
          {ahead.heroLine ? (
            <Text style={{ color: family.inkSeed, fontSize: 19, lineHeight: 25, fontWeight: "800", marginTop: 14 }}>{ahead.heroLine}</Text>
          ) : null}
          <Text style={{ color: family.deep, fontSize: 13.5, lineHeight: 20, marginTop: ahead.heroLine ? 5 : 12 }}>{ahead.heroSub}</Text>
          {ahead.blocks.map((block) => (
            <RecapBlockView key={block.title} block={block} family={family} />
          ))}
          <RecapEncouragementView encouragement={ahead.encouragement} family={family} />
        </View>
      ) : null}
    </View>
  );
}

// ─── Relocated from the deleted board file (v280) ───────────────────
// Fast-core readers the People page's fasting card depends on. Their
// code is byte-identical to the board-era originals; only the home
// changed, so People's fasting card renders exactly as before.

/** Small flickering flame (opacity + scale only), echoing the Prayer candle. */
export function FastFlame({ size = 16, color = "#FFB300" }: { size?: number; color?: string }) {
  const op = useRef(new Animated.Value(0.8)).current;
  const s = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 0.95, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.7, duration: 450, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.9, duration: 750, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.8, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const flame = Animated.loop(
      Animated.sequence([
        Animated.timing(s, { toValue: 1.1, duration: 500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(s, { toValue: 0.95, duration: 620, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    glow.start();
    flame.start();
    return () => {
      glow.stop();
      flame.stop();
    };
  }, [op, s]);

  return (
    <Animated.View style={{ width: size * 0.7, height: size, opacity: op, transform: [{ scale: s }] }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size * 0.7,
          height: size,
          borderRadius: size * 0.35,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: size * 0.18,
          top: size * 0.34,
          width: size * 0.34,
          height: size * 0.5,
          borderRadius: size * 0.17,
          backgroundColor: "#FFF8E1",
        }}
      />
    </Animated.View>
  );
}

/** Calm end-of-fast summary — no win/lose language, no confetti. */
export function FastSummaryCard({
  fast,
  colors,
}: {
  fast: PersonalFast;
  colors: { foreground: string; muted: string };
}) {
  const progress = getFastProgress(fast);
  return (
    <View style={{ alignItems: "center", paddingVertical: 8 }}>
      <FastFlame size={22} />
      <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "800", marginTop: 10, textAlign: "center" }}>
        You completed {progress.completed} of {fast.durationDays} days
      </Text>
      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6, textAlign: "center" }}>
        Ready for the next one?
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  cardFlush: { padding: 0, overflow: "hidden" },
  // The mockup's why card is a flat tonal container — no shadow.
  cardShadowless: { shadowOpacity: 0, elevation: 0 },
  cardBand: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 11 },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardHeadSub: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4 },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  textButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  textButtonLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500" },
  whyText: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, fontWeight: "500", marginTop: 8 },
  whyEmpty: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, marginTop: 8, fontStyle: "italic" },

  hero: {
    borderRadius: 34,
    borderBottomLeftRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    marginTop: 14,
    // The mockup's hero shadow is the deep seed at ~38% — derived
    // from the family, never the mockup's violet rgba (v280).
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.38,
    shadowRadius: 24,
    elevation: 6,
  },
  heroKicker: { fontSize: 11, lineHeight: 16, fontWeight: "700", letterSpacing: 1.6, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 10 },
  ringWrap: { width: 118, height: 118, position: "relative" },
  ringCenter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  // v283: Android's default includeFontPadding inflates both ring
  // texts past their line heights, which pushed the caption low in
  // the ring where the circle's chord is narrower than the
  // letter-spaced text — its ends crossed the stroke (his Oct 27
  // screenshot). Padding off, and the caption is fenced to a width
  // the ring's middle chord holds, centered.
  ringPct: { fontSize: 31, lineHeight: 36, fontWeight: "700", color: "#FFFFFF", includeFontPadding: false },
  ringOf: { fontSize: 10, lineHeight: 14, fontWeight: "600", letterSpacing: 1.0, color: "rgba(255,255,255,0.78)", includeFontPadding: false, width: 84, textAlign: "center" },
  heroDay: { fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.3, color: "#FFFFFF" },
  heroDayOf: { fontSize: 20, lineHeight: 26, fontWeight: "500", color: "rgba(255,255,255,0.75)" },
  heroSub: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  heroNote: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: "rgba(255,255,255,0.78)", marginTop: 12 },

  seg: { flexDirection: "row", height: 40, borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  segItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  segLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },

  weekRow: { paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1 },
  weekMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  weekTitle: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  weekDates: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, marginLeft: 8 },
  weekKept: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  dots: { flexDirection: "row", justifyContent: "space-between" },
  dotCell: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  dotHalo: { position: "absolute", width: 42, height: 42, borderRadius: 21, left: -3, top: -3 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dotNum: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  dotLabel: { width: 36, textAlign: "center", fontSize: 11, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginTop: 4 },

  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  leadCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dayBadge: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayBadgeNum: { fontSize: 16, lineHeight: 20, fontWeight: "500" },
  dayBadgeCap: { fontSize: 11, lineHeight: 12, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase" },
  rowTitle: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  rowSub: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, marginTop: 1 },
  stateTag: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 1 },
  noteText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25 },

  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 22, lineHeight: 28, fontWeight: "500" },
  sheetSub: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, marginTop: 2 },
  field: { borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, marginTop: 22, position: "relative" },
  fieldLabel: { position: "absolute", top: -9, left: 12, paddingHorizontal: 4, fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  fieldInput: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, minHeight: 48, textAlignVertical: "top" },
  encourage: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, marginTop: 16 },
  encourageKicker: { fontSize: 11, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
  encourageText: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, fontStyle: "italic" },
  encourageRef: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, marginTop: 6 },
  actions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 4, marginTop: 16 },
  filledButton: { height: 40, paddingHorizontal: 24, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  filledButtonLabel: { color: "#FFFFFF", fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },

  docCard: { borderRadius: 16, overflow: "hidden", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 10, elevation: 2 },
  docBand: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  docTitle: { fontSize: 24, lineHeight: 32, fontWeight: "500", marginTop: 8 },
  docBody: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 6 },
  countRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1 },
  countDot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4, marginRight: 10 },
  countLabel: { flex: 1, fontSize: 16, lineHeight: 24, letterSpacing: 0.5 },
  countValue: { fontSize: 16, lineHeight: 24, fontWeight: "500" },
  docParagraph: { fontSize: 16, lineHeight: 24, letterSpacing: 0.5, marginTop: 14 },
});
