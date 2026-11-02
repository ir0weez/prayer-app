/**
 * v414 — the Daily Brief page (daily-breakdown-concepts-v6.html,
 * first view; Jonathan, Nov 2: "love it all, do it"). The 8:00 AM
 * keyword door on the schedule opens here.
 *
 * The page assembles on open from the phone's own stores — the
 * day's events, ministries and studies, the day's todos, the
 * people list, the fast log — plus the morning pack sections
 * already imported (gas / email digest / news briefing). Nothing
 * is fetched and nothing is invented:
 *  - the hero's planned share is the whites engine's own math
 *    over the day's timed blocks (lib/daily-brief.ts);
 *  - each event's prep line derives only from that event's stored
 *    fields, in the brief's priority (note, leave time, location,
 *    a tied person's lead need, an attached todo);
 *  - GOOD TO KNOW shows a row only for a pack section actually
 *    present, stamped with when that section was prepared;
 *  - a section with no data does not render at all.
 * There is deliberately no Finished bar: the door event is
 * generated at render time and exists in no store to finish.
 */
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { WavyProgress } from "@/components/wavy-progress";
import { useNewsEmailMaterial } from "@/hooks/use-news-email-material";
import type { NewsEmailMaterialFamily } from "@/lib/news-email-material";
import {
  EVENT_KEYWORD_MAP,
  SCHEDULE_BIBLE_STUDIES_KEY,
  SCHEDULE_EVENTS_KEY,
  SCHEDULE_MINISTRIES_KEY,
  SCHEDULE_TODOS_KEY,
  detectEventKeyword,
  getBibleStudiesForDate,
  getEventsForDate,
  getMinistriesForDate,
  getTodosForDate,
  toggleTodoCompleted,
  type BibleStudySession,
  type ScheduleEvent,
  type ScheduleMinistry,
  type ScheduleTodo,
} from "@/lib/schedule-data";
import { getPrayTodayList, getTodayISOString, type Person } from "@/lib/prayercircle-data";
import { FASTS_STORAGE_KEY, PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import {
  getActiveFast,
  getCurrentFastDay,
  getFastEndDate,
  parseStoredFasts,
} from "@/lib/prayercircle-fasting";
import { getDueReachOut } from "@/lib/reach-out";
import {
  briefDayLine,
  goodToKnowRows,
  plannedShareForDay,
  prepLineForEvent,
  type GoodToKnowRow,
  type PrepLine,
} from "@/lib/daily-brief";
import type { WhiteSourceItem } from "@/lib/whites";
import { timeToMinutes } from "@/lib/time-blocks";
import { format12HourTime } from "@/lib/utils";
import { loadGasSnapshot, type GasPriceSnapshot } from "@/lib/gas-prices";
import { loadEmailDigest, type EmailDigest } from "@/lib/email-digest";
import { loadNewsBriefing, type NewsBriefingSnapshot } from "@/lib/news-briefing";

const DOW_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function parseArray<T>(raw: string | null): T[] {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

function durationLabel(start: string, end: string): string | undefined {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins <= 0) return undefined;
  if (mins < 60) return `${mins} minutes`;
  if (mins === 60) return "1 hour";
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return r === 0 ? `${h} hours` : `${h} hr ${r} min`;
}

type BriefRow = {
  key: string;
  title: string;
  startTime?: string;
  whenLine?: string;
  icon: string;
  tint: string | null;
  prep: PrepLine;
};

const GTK_ICONS: Record<GoodToKnowRow["kind"], string> = {
  gas: "local-gas-station",
  email: "mail",
  news: "article",
};

export default function DailyBriefScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string; eventDate?: string }>();
  const m = useNewsEmailMaterial();
  const date = params.eventDate ?? getTodayISOString();

  const [loaded, setLoaded] = useState(false);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [ministries, setMinistries] = useState<ScheduleMinistry[]>([]);
  const [studies, setStudies] = useState<BibleStudySession[]>([]);
  const [todos, setTodos] = useState<ScheduleTodo[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [fastDay, setFastDay] = useState<number | null>(null);
  const [gas, setGas] = useState<GasPriceSnapshot | null>(null);
  const [digest, setDigest] = useState<EmailDigest | null>(null);
  const [news, setNews] = useState<NewsBriefingSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const [rawEvents, rawMinistries, rawStudies, rawTodos, rawPeople, rawFasts, gasSnap, digestSnap, newsSnap] =
            await Promise.all([
              AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
              AsyncStorage.getItem(SCHEDULE_MINISTRIES_KEY),
              AsyncStorage.getItem(SCHEDULE_BIBLE_STUDIES_KEY),
              AsyncStorage.getItem(SCHEDULE_TODOS_KEY),
              AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
              AsyncStorage.getItem(FASTS_STORAGE_KEY),
              loadGasSnapshot(),
              loadEmailDigest(),
              loadNewsBriefing(),
            ]);
          if (!live) return;
          setEvents(parseArray<ScheduleEvent>(rawEvents));
          setMinistries(parseArray<ScheduleMinistry>(rawMinistries));
          setStudies(parseArray<BibleStudySession>(rawStudies));
          setTodos(parseArray<ScheduleTodo>(rawTodos));
          setPeople(parseArray<Person>(rawPeople));
          const { fasts } = parseStoredFasts(rawFasts);
          const active = getActiveFast(fasts, date);
          setFastDay(
            active && date >= active.startDate && date <= getFastEndDate(active)
              ? getCurrentFastDay(active, date)
              : null,
          );
          setGas(gasSnap);
          setDigest(digestSnap);
          setNews(newsSnap);
        } catch {
          // A store that will not read leaves its section absent —
          // the page never invents what it could not load.
        } finally {
          if (live) setLoaded(true);
        }
      })();
      return () => {
        live = false;
      };
    }, [date]),
  );

  const dayEvents = useMemo(() => getEventsForDate(events, date), [events, date]);
  const dayMinistries = useMemo(() => getMinistriesForDate(ministries, date), [ministries, date]);
  const dayStudies = useMemo(() => getBibleStudiesForDate(studies, date), [studies, date]);
  const dayTodos = useMemo(() => getTodosForDate(todos, date), [todos, date]);
  const openTodos = useMemo(() => dayTodos.filter((t) => !t.isCompleted), [dayTodos]);

  const queueCount = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return getPrayTodayList(people, d.getDay(), d.getDate()).length;
  }, [people, date]);
  const reachCount = useMemo(
    () => getDueReachOut(people, new Date(`${date}T12:00:00`)).length,
    [people, date],
  );

  const share = useMemo(() => {
    const items: WhiteSourceItem[] = [
      ...dayEvents.filter((e) => e.startTime).map((e) => ({ ...e, kind: "event" as const })),
      ...dayMinistries.filter((mn) => mn.startTime).map((mn) => ({ ...mn, kind: "ministry" as const })),
      ...dayStudies.filter((s) => s.startTime).map((s) => ({ ...s, kind: "study" as const })),
      ...dayTodos
        .filter((t) => t.startTime)
        .map((t) => ({
          startTime: t.startTime,
          endTime: t.endTime,
          isCompleted: t.isCompleted,
          kind: "todo" as const,
        })),
    ];
    return plannedShareForDay(items);
  }, [dayEvents, dayMinistries, dayStudies, dayTodos]);

  const rows = useMemo<BriefRow[]>(() => {
    const built: BriefRow[] = [];
    for (const e of dayEvents) {
      const kw =
        (e.keyword ? EVENT_KEYWORD_MAP.find((k) => k.label === e.keyword) : undefined) ??
        detectEventKeyword(e.title, e.location, e.notes);
      let whenLine =
        e.startTime && e.endTime ? durationLabel(e.startTime, e.endTime) : undefined;
      if (kw?.label === "Prayer" && queueCount > 0) {
        whenLine = `Today's queue · ${queueCount} people`;
      }
      built.push({
        key: `event-${e.id}`,
        title: e.title,
        startTime: e.startTime,
        whenLine,
        icon: kw?.icon ?? "event",
        tint: kw?.accentColor ?? null,
        prep: prepLineForEvent(e, { people, todos }),
      });
    }
    for (const mn of dayMinistries) {
      const kw = detectEventKeyword(mn.title, mn.location, mn.notes);
      built.push({
        key: `ministry-${mn.id}`,
        title: mn.title,
        startTime: mn.startTime,
        whenLine: mn.startTime && mn.endTime ? durationLabel(mn.startTime, mn.endTime) : undefined,
        icon: kw?.icon ?? "volunteer-activism",
        tint: kw?.accentColor ?? null,
        prep: prepLineForEvent(
          {
            id: mn.id,
            title: mn.title,
            date,
            notes: mn.notes,
            travelTimeMinutes: mn.travelTimeMinutes,
            startTime: mn.startTime,
            location: mn.location,
            linkedPeopleIds: mn.linkedPeopleIds,
            isCompleted: mn.isCompleted,
          },
          { people, todos },
        ),
      });
    }
    for (const s of dayStudies) {
      const kw = detectEventKeyword("Bible Study");
      built.push({
        key: `study-${s.id}`,
        title: `${s.book} ${s.chapter}`,
        startTime: s.startTime,
        whenLine: s.startTime && s.endTime ? durationLabel(s.startTime, s.endTime) : undefined,
        icon: kw?.icon ?? "menu-book",
        tint: kw?.accentColor ?? null,
        prep: prepLineForEvent(
          { id: s.id, title: `${s.book} ${s.chapter}`, date, notes: s.notes, isCompleted: s.isCompleted },
          { people, todos },
        ),
      });
    }
    return built
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const at = a.row.startTime;
        const bt = b.row.startTime;
        if (at && bt) return at.localeCompare(bt) || a.index - b.index;
        if (at) return -1;
        if (bt) return 1;
        return a.index - b.index;
      })
      .map(({ row }) => row);
  }, [dayEvents, dayMinistries, dayStudies, people, todos, queueCount, date]);

  const heroLine = useMemo(
    () =>
      briefDayLine({
        timedEvents: rows
          .filter((r) => r.startTime)
          .map((r) => ({ title: r.title, startTime: r.startTime as string })),
        eventCount: rows.length,
        todoCount: openTodos.length,
      }),
    [rows, openTodos],
  );

  const chips = useMemo(() => {
    const list: Array<{ lead: string; rest: string }> = [];
    const firstTimed = rows.find((r) => r.startTime);
    if (firstTimed) {
      list.push({ lead: "First up", rest: `${firstTimed.title} ${format12HourTime(firstTimed.startTime as string)}` });
    }
    if (queueCount > 0) list.push({ lead: String(queueCount), rest: "in the pray queue" });
    if (reachCount > 0) list.push({ lead: String(reachCount), rest: "to reach out to" });
    if (fastDay !== null) list.push({ lead: `Day ${fastDay}`, rest: "of the fast" });
    if (openTodos.length > 0) {
      list.push({ lead: String(openTodos.length), rest: openTodos.length === 1 ? "todo due" : "todos due" });
    }
    return list;
  }, [rows, queueCount, reachCount, fastDay, openTodos]);

  const gtkRows = useMemo(() => goodToKnowRows({ gas, digest, news }), [gas, digest, news]);
  const packPresent = Boolean(gas || digest || news);
  const pct = Math.round(share * 100);

  const onToggleTodo = useCallback((todoId: string) => {
    setTodos((prev) => {
      const next = toggleTodoCompleted(prev, todoId);
      AsyncStorage.setItem(SCHEDULE_TODOS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const chipDate = useMemo(() => {
    const d = new Date(`${date}T12:00:00`);
    return `${DOW_SHORT[d.getDay()]} · ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  }, [date]);

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: m.ground }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header — back, the door's name, the day chip. */}
          <View style={styles.headRow}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.backButton, { backgroundColor: m.card, shadowColor: m.shadow }]}
            >
              <MaterialIcons name="chevron-left" size={22} color={m.ink} />
            </Pressable>
            <Text style={[styles.headName, { color: m.inkSoft }]}>Daily Brief</Text>
            <View style={[styles.dateChip, { backgroundColor: m.tonal }]}>
              <MaterialIcons name="event" size={13} color={m.tonalInk} />
              <Text style={[styles.dateChipText, { color: m.tonalInk }]}>{chipDate}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: m.ink }]}>Daily Brief</Text>
          <Text style={[styles.assembled, { color: m.inkSoft }]}>
            {packPresent
              ? "From your schedule, todos, people and this morning's pack"
              : "From your schedule, todos and people"}
          </Text>

          {loaded ? (
            <>
              {/* The hero — the day in one line, over the wavy share. */}
              <View style={[styles.hero, { backgroundColor: m.openBox }]}>
                <Text style={[styles.heroKicker, { color: m.openInkSoft }]}>The Day In One Line</Text>
                <Text style={[styles.heroLine, { color: m.openInk }]}>{heroLine}</Text>
                <WavyProgress
                  value={share}
                  color={m.seed}
                  trackColor={m.card}
                  height={14}
                  style={{ marginTop: 14 }}
                />
                <View style={styles.heroCapRow}>
                  <Text style={[styles.heroCapStrong, { color: m.openInk }]}>{pct}% of the day is planned</Text>
                  <Text style={[styles.heroCapSoft, { color: m.openInkSoft }]}>
                    {share >= 0.999 ? "the day is full" : "the rest is open time"}
                  </Text>
                </View>
                {chips.length > 0 ? (
                  <View style={styles.chipRow}>
                    {chips.map((chip) => (
                      <View key={`${chip.lead}-${chip.rest}`} style={[styles.chip, { backgroundColor: m.card }]}>
                        <Text style={[styles.chipText, { color: m.inkSoft }]}>
                          <Text style={[styles.chipLead, { color: m.ink }]}>{chip.lead}</Text> {chip.rest}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>

              {/* The day, in order — one open list, no boxes in boxes. */}
              {rows.length > 0 ? (
                <>
                  <SectionHead m={m} title="The Day, In Order" count={`${rows.length} blocks`} />
                  <View>
                    {rows.map((row, i) => (
                      <View key={row.key} style={[styles.evBlock, i > 0 && { borderTopWidth: 1, borderTopColor: m.line }]}>
                        <View style={styles.evRow}>
                          <View
                            style={[
                              styles.medallion,
                              { backgroundColor: row.tint ? `${row.tint}22` : m.tonal },
                            ]}
                          >
                            <MaterialIcons
                              name={row.icon as keyof typeof MaterialIcons.glyphMap}
                              size={19}
                              color={row.tint ?? m.tonalInk}
                            />
                          </View>
                          <View style={styles.evText}>
                            <Text style={[styles.evName, { color: m.ink }]}>{row.title}</Text>
                            {row.whenLine ? (
                              <Text style={[styles.evWhen, { color: m.inkSoft }]}>{row.whenLine}</Text>
                            ) : null}
                          </View>
                          {row.startTime ? (
                            <View style={[styles.timePill, { backgroundColor: m.tonal }]}>
                              <Text style={[styles.timePillText, { color: m.tonalInk }]}>
                                {format12HourTime(row.startTime)}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <View style={styles.prepRow}>
                          <MaterialIcons name="check-circle" size={15} color="#3E9B4F" />
                          <Text style={[styles.prepText, { color: m.inkSoft }]}>
                            {row.prep.lead ? (
                              <Text style={[styles.prepLead, { color: m.ink }]}>{row.prep.lead}</Text>
                            ) : null}
                            {row.prep.lead && row.prep.rest ? " — " : ""}
                            {row.prep.rest}
                            {!row.prep.lead && !row.prep.rest ? "Nothing to bring." : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Todos due — real checkboxes on the app's own path. */}
              {dayTodos.length > 0 ? (
                <>
                  <SectionHead m={m} title="Todos Due Today" count={String(dayTodos.length)} />
                  <View style={[styles.card, { backgroundColor: m.card, shadowColor: m.shadow }]}>
                    {dayTodos.map((todo, i) => (
                      <Pressable
                        key={todo.id}
                        onPress={() => onToggleTodo(todo.id)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: todo.isCompleted }}
                        style={[styles.todoRow, i > 0 && { borderTopWidth: 1, borderTopColor: m.line }]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            { borderColor: m.inkSoft },
                            todo.isCompleted && { backgroundColor: m.seed, borderColor: m.seed },
                          ]}
                        >
                          {todo.isCompleted ? <MaterialIcons name="check" size={15} color={m.onSeed} /> : null}
                        </View>
                        <Text
                          style={[
                            styles.todoTitle,
                            { color: todo.isCompleted ? m.inkSoft : m.ink },
                            todo.isCompleted && styles.todoDone,
                          ]}
                        >
                          {todo.title}
                        </Text>
                        {todo.startTime ? (
                          <View style={[styles.timePill, { backgroundColor: m.tonal }]}>
                            <Text style={[styles.timePillText, { color: m.tonalInk }]}>
                              {format12HourTime(todo.startTime)}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}

              {/* Good to know — only the pack sections that exist. */}
              {gtkRows.length > 0 ? (
                <>
                  <SectionHead m={m} title="Good To Know" />
                  <View style={[styles.card, { backgroundColor: m.card, shadowColor: m.shadow }]}>
                    {gtkRows.map((row, i) => (
                      <View
                        key={row.kind}
                        style={[styles.gtkRow, i > 0 && { borderTopWidth: 1, borderTopColor: m.line }]}
                      >
                        <View style={[styles.medallion, { backgroundColor: m.tonal }]}>
                          <MaterialIcons
                            name={GTK_ICONS[row.kind] as keyof typeof MaterialIcons.glyphMap}
                            size={19}
                            color={m.tonalInk}
                          />
                        </View>
                        <View style={styles.evText}>
                          <Text style={[styles.gtkHeadline, { color: m.ink }]}>{row.headline}</Text>
                          {row.sub ? (
                            <Text style={[styles.evWhen, { color: m.inkSoft }]}>{row.sub}</Text>
                          ) : null}
                        </View>
                        <View style={[styles.stamp, { backgroundColor: m.chipOnCard }]}>
                          <Text style={[styles.stampText, { color: m.chipOnCardInk }]}>{row.stamp}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function SectionHead({ m, title, count }: { m: NewsEmailMaterialFamily; title: string; count?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: m.inkSoft }]}>{title}</Text>
      {count ? (
        <View style={[styles.countChip, { backgroundColor: m.tonal }]}>
          <Text style={[styles.countChipText, { color: m.tonalInk }]}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingTop: 14, paddingBottom: 40 },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  headName: { flex: 1, fontSize: 11, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  dateChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontSize: 30, fontWeight: "800", marginTop: 14 },
  assembled: { fontSize: 12.5, marginTop: 3 },
  hero: { borderRadius: 18, padding: 16, marginTop: 16 },
  heroKicker: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  heroLine: { fontSize: 16.5, fontWeight: "700", lineHeight: 23, marginTop: 5 },
  heroCapRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 9 },
  heroCapStrong: { fontSize: 12, fontWeight: "800" },
  heroCapSoft: { fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 12 },
  chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 11.5, fontWeight: "600" },
  chipLead: { fontWeight: "800" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  countChip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  countChipText: { fontSize: 10.5, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },
  evBlock: { paddingVertical: 10 },
  evRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  medallion: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  evText: { flex: 1 },
  evName: { fontSize: 15, fontWeight: "800" },
  evWhen: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  timePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  timePillText: { fontSize: 11, fontWeight: "800" },
  prepRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginLeft: 50, marginTop: 5 },
  prepText: { flex: 1, fontSize: 12.5, lineHeight: 18 },
  prepLead: { fontWeight: "800" },
  card: {
    borderRadius: 16,
    paddingHorizontal: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  todoRow: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  todoTitle: { flex: 1, fontSize: 13.5, fontWeight: "700" },
  todoDone: { textDecorationLine: "line-through" },
  gtkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  gtkHeadline: { fontSize: 13, fontWeight: "800" },
  stamp: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4 },
  stampText: { fontSize: 9, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
});
