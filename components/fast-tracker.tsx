import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { PeopleFrontDoorFamily } from "@/lib/people-material";
import {
  FAST_KEPT,
  FAST_MISSED_DEEP,
  FAST_MISSED_WASH,
  FAST_RECAP_GOLD,
  FAST_SKIPPED_DEEP,
  FAST_SKIPPED_WASH,
  getFastEncouragement,
  getFastNoteStream,
  getFastWeekKeptLabel,
  type FastRecap,
  type FastWeek,
} from "@/lib/fast-tracker";
import {
  formatIsoToMmDdYyyy,
  getFastCalendarDays,
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
}) {
  const { family, options, value, onChange, onHero, selectedPaints } = props;
  return (
    <View
      style={[
        styles.seg,
        onHero
          ? { borderColor: "rgba(255,255,255,0.55)", backgroundColor: "rgba(255,255,255,0.10)" }
          : { borderColor: family.line, backgroundColor: family.card },
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
    <View style={[styles.card, { backgroundColor: family.wash2, shadowColor: family.shadow }]}>
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
    <View style={[styles.hero, { backgroundColor: family.seed }]}>
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
  const activeQ = quarters?.[activeQuarter];
  const shownWeeks = [...weeks].reverse();
  return (
    <View style={[styles.card, { backgroundColor: family.card, shadowColor: family.shadow }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.kicker, { color: family.deep }]}>THE RECORD</Text>
        <Text style={[styles.cardHeadSub, { color: family.inkSoft }]}>Weeks · notes · recaps</Text>
      </View>

      {quarters && activeQ ? (
        <>
          <View style={{ marginTop: 12 }}>
            <FastSegmentedControl
              family={family}
              options={quarters.map((q) => ({ value: String(q.index), label: q.label }))}
              value={String(activeQuarter)}
              onChange={(value) => onQuarterChange(Number(value))}
            />
          </View>
          <Text style={[styles.quarterCaption, { color: family.inkSoft }]}>
            {activeQ.monthRange} · Days {activeQ.startDay}–{activeQ.endDay}
          </Text>
        </>
      ) : null}

      {shownWeeks.map((week) => (
        <View key={week.weekNumber} style={[styles.weekRow, { borderBottomColor: family.line }]}>
          <View style={styles.weekMeta}>
            <View style={{ flexDirection: "row", alignItems: "baseline", flex: 1 }}>
              <Text style={[styles.weekTitle, { color: family.ink }]}>Week {week.weekNumber}</Text>
              <Text style={[styles.weekDates, { color: family.inkSoft }]}>
                Days {week.days[0].dayNumber}–{week.days[week.days.length - 1].dayNumber}
                {week.current ? " · this week" : ""}
              </Text>
            </View>
            <Text style={[styles.weekKept, { color: family.inkSoft }]}>
              <Text style={{ color: "#1E9E6A", fontWeight: "600" }}>{week.kept}</Text>
              {getFastWeekKeptLabel(week).slice(String(week.kept).length)}
            </Text>
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
              return (
                <Pressable
                  key={day.date}
                  onPress={() => onOpenDay(day.date)}
                  style={[styles.dot, dotStyle]}
                  accessibilityRole="button"
                  accessibilityLabel={`Day ${day.dayNumber}${day.status ? `, ${STATUS_LABEL[day.status]}` : ""}`}
                >
                  <Text style={[styles.dotNum, { color: numColor }]}>{day.dayNumber}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.dots}>
            {week.days.map((day) => (
              <Text key={day.date} style={[styles.dotLabel, { color: family.inkSoft }]}>
                {weekdayShort(day.date)}
              </Text>
            ))}
          </View>
        </View>
      ))}

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
export type FastRecapTarget = { kind: "week"; weekNumber: number } | { kind: "final" } | { kind: "all" };

export function FastRecapsCard(props: {
  family: FastTrackerFamily;
  fast: PersonalFast;
  weeks: FastWeek[];
  finalReady: boolean;
  onOpenRecap: (target: FastRecapTarget) => void;
}) {
  const { family, weeks, finalReady, fast, onOpenRecap } = props;
  const currentWeek = weeks.find((w) => w.current);
  const endedWeeks = weeks.filter((w) => w.ended).reverse();
  const shownEnded = endedWeeks.slice(0, 3);
  return (
    <View style={[styles.card, styles.cardFlush, { backgroundColor: family.card, shadowColor: family.shadow }]}>
      <View style={[styles.cardBand, { backgroundColor: family.wash }]}>
        <Text style={[styles.kicker, { color: family.deep }]}>RECAPS</Text>
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        {currentWeek && !finalReady ? (
          <View style={[styles.listRow, { borderBottomColor: family.line }]}>
            <View style={[styles.leadCircle, { backgroundColor: family.wash }]}>
              <MaterialIcons name="description" size={20} color={family.deep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: family.ink }]}>Week {currentWeek.weekNumber} recap</Text>
              <Text style={[styles.rowSub, { color: family.inkSoft }]}>Arrives when the week closes</Text>
            </View>
          </View>
        ) : null}
        {shownEnded.map((week) => {
          const counts = {
            kept: week.days.filter((d) => d.status === "completed").length,
            skipped: week.days.filter((d) => d.status === "skipped").length,
            missed: week.days.filter((d) => d.status === "missed").length,
          };
          return (
            <Pressable
              key={week.weekNumber}
              onPress={() => onOpenRecap({ kind: "week", weekNumber: week.weekNumber })}
              style={[styles.listRow, { borderBottomColor: family.line }]}
            >
              <View style={[styles.leadCircle, { backgroundColor: family.wash }]}>
                <MaterialIcons name="description" size={20} color={family.deep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { color: family.ink }]}>Week {week.weekNumber} recap</Text>
                <Text style={[styles.rowSub, { color: family.inkSoft }]}>
                  {counts.kept} kept · {counts.skipped} skipped · {counts.missed} missed
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
            </Pressable>
          );
        })}
        {endedWeeks.length > shownEnded.length && (
          <Pressable onPress={() => onOpenRecap({ kind: "all" })} style={[styles.listRow, { borderBottomColor: family.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: family.deep }]}>See all recaps</Text>
              <Text style={[styles.rowSub, { color: family.inkSoft }]}>{endedWeeks.length} weekly recaps</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
          </Pressable>
        )}
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
          {finalReady && <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />}
        </Pressable>
      </View>
    </View>
  );
}

/** Every ended week, for the recap viewer's "all" list. */
export function FastAllRecapsList(props: {
  family: FastTrackerFamily;
  weeks: FastWeek[];
  onOpenRecap: (target: FastRecapTarget) => void;
}) {
  const { family, weeks, onOpenRecap } = props;
  const endedWeeks = weeks.filter((w) => w.ended).reverse();
  return (
    <View>
      {endedWeeks.map((week) => (
        <Pressable
          key={week.weekNumber}
          onPress={() => onOpenRecap({ kind: "week", weekNumber: week.weekNumber })}
          style={[styles.listRow, { borderBottomColor: family.line }]}
        >
          <View style={[styles.leadCircle, { backgroundColor: family.wash }]}>
            <MaterialIcons name="description" size={20} color={family.deep} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: family.ink }]}>Week {week.weekNumber} recap</Text>
            <Text style={[styles.rowSub, { color: family.inkSoft }]}>
              Days {week.days[0].dayNumber}–{week.days[week.days.length - 1].dayNumber}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={family.inkSoft} />
        </Pressable>
      ))}
      {endedWeeks.length === 0 && (
        <Text style={[styles.noteText, { color: family.inkSoft, paddingVertical: 12 }]}>
          No week has closed yet — the first recap arrives when Week 1 ends.
        </Text>
      )}
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
  const weekNumber = dayNumber > 0 ? Math.ceil(dayNumber / 7) : 0;
  const [status, setStatus] = useState<FastDayStatus | null>(fast.dayStatuses[date] ?? null);
  const [note, setNote] = useState(fast.dailyNotes?.[date] ?? "");
  const encouragement = getFastEncouragement(status ?? undefined);
  return (
    <View>
      <View style={[styles.handle, { backgroundColor: family.line }]} />
      <Text style={[styles.sheetTitle, { color: family.ink }]}>Day {dayNumber}</Text>
      <Text style={[styles.sheetSub, { color: family.inkSoft }]}>
        {weekdayName(date)} · {formatIsoToMmDdYyyy(date)} · Week {weekNumber} of the fast
      </Text>

      <View style={{ marginTop: 16 }}>
        <FastSegmentedControl
          family={family}
          options={STATUS_OPTIONS}
          value={status}
          onChange={(next) => setStatus(next)}
          selectedPaints={{
            missed: { backgroundColor: FAST_MISSED_WASH, color: FAST_MISSED_DEEP },
            skipped: { backgroundColor: FAST_SKIPPED_WASH, color: FAST_SKIPPED_DEEP },
          }}
        />
      </View>
      {status !== null && (
        <Pressable onPress={() => setStatus(null)} hitSlop={6} style={{ alignSelf: "flex-start", marginTop: 6 }}>
          <Text style={[styles.textButtonLabel, { color: family.deep }]}>Clear mark</Text>
        </Pressable>
      )}

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
export function FastRecapDocument(props: {
  family: FastTrackerFamily;
  recap: FastRecap;
  saved: boolean;
  onSaveToJournal: () => void;
  onClose: () => void;
}) {
  const { family, recap, saved, onSaveToJournal, onClose } = props;
  const countRows: { label: string; value: number; dot: string }[] = [
    { label: "Kept", value: recap.counts.kept, dot: FAST_KEPT },
    { label: "Skipped", value: recap.counts.skipped, dot: "#F59E0B" },
    { label: "Missed", value: recap.counts.missed, dot: "#E57373" },
  ];
  if (recap.longestStreak !== undefined) {
    countRows.push({ label: "Longest streak", value: recap.longestStreak, dot: FAST_RECAP_GOLD });
  }
  return (
    <View style={[styles.docCard, { backgroundColor: family.card, shadowColor: family.shadow }]}>
      <View style={[styles.docBand, { backgroundColor: family.wash2 }]}>
        <Text style={[styles.kicker, { color: family.deep }]}>
          {recap.kind === "final" ? "FINAL RECAP" : "WEEKLY RECAP"}
        </Text>
        <Text style={[styles.docTitle, { color: family.inkSeed }]}>{recap.title.replace(/ recap$/, "")}</Text>
        <Text style={[styles.rowSub, { color: family.washSub, marginTop: 2 }]}>{recap.subtitle}</Text>
      </View>
      <View style={styles.docBody}>
        <View style={{ marginTop: 4 }}>
          {countRows.map((row) => (
            <View key={row.label} style={[styles.countRow, { borderBottomColor: family.line }]}>
              <View style={[styles.countDot, { backgroundColor: row.dot }]} />
              <Text style={[styles.countLabel, { color: family.ink }]}>{row.label}</Text>
              <Text style={[styles.countValue, { color: family.ink }]}>
                {row.value}
                {row.label === "Longest streak" ? " days" : ""}
              </Text>
            </View>
          ))}
        </View>
        {recap.paragraphs.map((paragraph, i) => (
          <Text key={i} style={[styles.docParagraph, { color: family.ink }]}>
            {paragraph}
          </Text>
        ))}
        <View style={styles.actions}>
          <Pressable onPress={onClose} style={styles.textButton}>
            <Text style={[styles.textButtonLabel, { color: family.deep }]}>Not now</Text>
          </Pressable>
          <Pressable
            onPress={onSaveToJournal}
            disabled={saved}
            style={[styles.filledButton, { backgroundColor: saved ? family.wash2 : family.seed }]}
          >
            <Text style={[styles.filledButtonLabel, saved && { color: family.deep }]}>
              {saved ? "Saved to Journal" : "Save to Journal"}
            </Text>
          </Pressable>
        </View>
      </View>
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
    shadowColor: "rgba(76,29,149,0.38)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 6,
  },
  heroKicker: { fontSize: 11, lineHeight: 16, fontWeight: "700", letterSpacing: 1.6, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 10 },
  ringWrap: { width: 118, height: 118, position: "relative" },
  ringCenter: { position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  ringPct: { fontSize: 31, lineHeight: 36, fontWeight: "700", color: "#FFFFFF" },
  ringOf: { fontSize: 10, lineHeight: 14, fontWeight: "600", letterSpacing: 1.2, color: "rgba(255,255,255,0.78)" },
  heroDay: { fontSize: 34, lineHeight: 40, fontWeight: "700", letterSpacing: -0.3, color: "#FFFFFF" },
  heroDayOf: { fontSize: 20, lineHeight: 26, fontWeight: "500", color: "rgba(255,255,255,0.75)" },
  heroSub: { fontSize: 14, lineHeight: 20, letterSpacing: 0.25, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  heroNote: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, color: "rgba(255,255,255,0.78)", marginTop: 12 },

  seg: { flexDirection: "row", height: 40, borderWidth: 1, borderRadius: 20, overflow: "hidden", marginTop: 16 },
  segItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  segLabel: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },

  quarterCaption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, marginTop: 8 },
  weekRow: { paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1 },
  weekMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 },
  weekTitle: { fontSize: 14, lineHeight: 20, fontWeight: "500", letterSpacing: 0.1 },
  weekDates: { fontSize: 12, lineHeight: 16, letterSpacing: 0.4, marginLeft: 8 },
  weekKept: { fontSize: 12, lineHeight: 16, fontWeight: "500", letterSpacing: 0.5 },
  dots: { flexDirection: "row", justifyContent: "space-between" },
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
