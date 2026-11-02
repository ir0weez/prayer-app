/**
 * v414 — the Year in Review page (daily-breakdown-concepts-v6.html,
 * third view; Jonathan, Nov 2). Reached only from the Fast page's
 * filled box, which itself exists only from December 31 of the
 * fast's year (lib/year-review.ts owns the gate). Everything on
 * this page derives from the stores at read time — the fast log,
 * the journal, the study track, the XP state, the people list —
 * so the review has been keeping itself all along; nothing here
 * is written at the end. Highs and lows are composed by
 * lib/year-review.ts only from what the data supports, and the
 * lows stay factual and kind: the fell days are written down, not
 * hidden.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { derivePeopleFrontDoor, type PeopleFrontDoorFamily } from "@/lib/people-material";
import {
  getActiveFast,
  getFastEndDate,
  parseStoredFasts,
  type PersonalFast,
} from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, JOURNAL_STORAGE_KEY, PEOPLE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { getTodayISOString } from "@/lib/prayercircle-data";
import { normalizePrayerJournalEntries, type PrayerJournalEntry } from "@/lib/prayer-journal";
import { loadXPState, type XpState } from "@/lib/xp-engine";
import { BIBLE_BOOKS } from "@/lib/bible-books";
import { loadStudyState } from "@/lib/bible-v205/study";
import { loadStudioImports } from "@/lib/bible-v205/studio-import";
import { bookAllRead, bookIsWritten, studyProgressTotals } from "@/lib/bible-v205/rewards";
import { formatRecapWeekLabel } from "@/lib/fast-tracker";
import {
  answeredCountForFast,
  hardestWeekOf,
  isYearReviewVisible,
  longestHeldRun,
  yearFastStats,
  yearGridFor,
  yearHighs,
  yearLows,
  yearReviewGateDate,
  yearReviewYear,
  type YearDayState,
  type YearReviewRow,
} from "@/lib/year-review";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const VOLUME_ONE = ["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"];

/** "Jan 1" from an ISO date, read in UTC like the fast calendar. */
function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** The reviewed fast: the one named by the box that opened this
 *  page; otherwise the latest fast whose gate has passed; otherwise
 *  the active fast (a defensive seat — the box never shows early). */
function pickReviewedFast(fasts: PersonalFast[], fastId: string | undefined, today: string): PersonalFast | null {
  if (fastId) {
    const named = fasts.find((f) => f.id === fastId);
    if (named) return named;
  }
  const visible = fasts
    .filter((f) => isYearReviewVisible(f, today))
    .sort((a, b) => yearReviewGateDate(b).localeCompare(yearReviewGateDate(a)));
  if (visible.length > 0) return visible[0];
  return getActiveFast(fasts, today) ?? fasts[fasts.length - 1] ?? null;
}

const ROW_TONES: Record<YearReviewRow["icon"], { bg: string; ink: string; glyph: string }> = {
  star: { bg: "#F7ECD2", ink: "#B98A1D", glyph: "star" },
  check: { bg: "#E2F2E8", ink: "#2F7D4F", glyph: "check" },
  chart: { bg: "#F6E3E1", ink: "#C2452F", glyph: "bar-chart" },
};

const DOT_COLORS: Record<Exclude<YearDayState, "today">, string> = {
  held: "#3E9B4F",
  close: "#E8A33D",
  fell: "#D64541",
  future: "",
  unmarked: "",
};

export default function YearInReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ fastId?: string }>();
  const colors = useColors();
  const scheme = useColorScheme();
  const family = useMemo(
    () => derivePeopleFrontDoor(colors.primary, scheme === "dark" ? "dark" : "light"),
    [colors.primary, scheme],
  );
  const today = getTodayISOString();

  const [fast, setFast] = useState<PersonalFast | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [peopleCount, setPeopleCount] = useState(0);
  const [entries, setEntries] = useState<PrayerJournalEntry[]>([]);
  const [xp, setXp] = useState<XpState | null>(null);
  const [writtenBooks, setWrittenBooks] = useState<string[]>([]);
  const [writtenTotal, setWrittenTotal] = useState(0);
  const [volumeOneFinished, setVolumeOneFinished] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      (async () => {
        try {
          const [rawFasts, rawPeople, rawJournal, xpState, studyState, imports] = await Promise.all([
            AsyncStorage.getItem(FASTS_STORAGE_KEY),
            AsyncStorage.getItem(PEOPLE_STORAGE_KEY),
            AsyncStorage.getItem(JOURNAL_STORAGE_KEY),
            loadXPState(),
            loadStudyState(),
            loadStudioImports(),
          ]);
          if (!live) return;
          const { fasts } = parseStoredFasts(rawFasts);
          setFast(pickReviewedFast(fasts, params.fastId, today));
          const parsedPeople: unknown = rawPeople ? JSON.parse(rawPeople) : [];
          setPeopleCount(Array.isArray(parsedPeople) ? parsedPeople.length : 0);
          setEntries(rawJournal ? normalizePrayerJournalEntries(JSON.parse(rawJournal)) : []);
          setXp(xpState);
          setWrittenBooks(BIBLE_BOOKS.filter((b) => bookIsWritten(studyState, b, imports)));
          setWrittenTotal(studyProgressTotals(studyState, BIBLE_BOOKS, imports).writtenBooks);
          setVolumeOneFinished(VOLUME_ONE.every((b) => bookAllRead(studyState, b)));
        } catch {
          // A store that will not read leaves the page on its empty
          // state rather than inventing a year.
        } finally {
          if (live) setLoaded(true);
        }
      })();
      return () => {
        live = false;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.fastId]),
  );

  const stats = useMemo(() => (fast ? yearFastStats(fast, today) : null), [fast, today]);
  const grid = useMemo(() => (fast ? yearGridFor(fast, today) : []), [fast, today]);
  const highs = useMemo(
    () =>
      fast
        ? yearHighs({
            volumeOneFinished,
            writtenBooks,
            longestHeldRun: longestHeldRun(fast),
            answeredCount: answeredCountForFast(entries, fast),
          })
        : [],
    [fast, volumeOneFinished, writtenBooks, entries],
  );
  const lows = useMemo(() => {
    if (!fast || !stats) return [];
    const hardest = hardestWeekOf(fast, today);
    return yearLows({
      missed: stats.missed,
      skipped: stats.skipped,
      hardestWeek: hardest,
      hardestWeekLabel: hardest ? formatRecapWeekLabel(hardest.startDate, hardest.endDate) : "",
    });
  }, [fast, stats, today]);

  // The hero count, counted up the way the drawing counts it.
  const target = stats?.elapsed ?? 0;
  const [shownCount, setShownCount] = useState(0);
  useEffect(() => {
    if (!loaded || !stats) return;
    let raf = 0;
    let startTs = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduced) => {
        if (cancelled) return;
        if (reduced || target === 0) {
          setShownCount(target);
          return;
        }
        const tick = (t: number) => {
          if (!startTs) startTs = t;
          const p = Math.min(1, (t - startTs) / 900);
          setShownCount(Math.round(target * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      })
      .catch(() => setShownCount(target));
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [loaded, stats, target]);

  const year = fast ? yearReviewYear(fast) : new Date().getFullYear();
  const endDate = fast ? getFastEndDate(fast) : today;

  return (
    <ScreenContainer className="p-0">
      <View style={{ flex: 1, backgroundColor: family.ground }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headRow}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={[styles.backButton, { backgroundColor: family.card, shadowColor: family.shadow }]}
            >
              <MaterialIcons name="chevron-left" size={22} color={family.ink} />
            </Pressable>
            <View style={[styles.headChip, { backgroundColor: family.wash }]}>
              <Text style={[styles.headChipText, { color: family.washInk }]}>The Fast Year</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: family.ink }]}>Year in Review</Text>
          <Text style={[styles.assembled, { color: family.inkSoft }]}>
            {fast
              ? `${year} · everything the app holds, ${dayLabel(fast.startDate)} to ${today >= endDate ? dayLabel(endDate) : "today"}`
              : "Nothing to review yet."}
          </Text>

          {loaded && fast && stats ? (
            <>
              {/* The hero — the year so far, in one number. */}
              <View style={[styles.hero, { backgroundColor: family.container }]}>
                <Text style={[styles.heroCount, { color: family.ink }]}>{shownCount}</Text>
                <Text style={[styles.heroCap, { color: family.inkSoft }]}>
                  {stats.remaining > 0
                    ? `days logged of ${stats.total} · ${stats.remaining} to go`
                    : `days logged of ${stats.total} · the year is complete`}
                </Text>
                <View style={styles.chipRow}>
                  {xp ? (
                    <>
                      <View style={[styles.chip, { backgroundColor: family.card }]}>
                        <Text style={[styles.chipText, { color: family.inkSoft }]}>
                          Level <Text style={[styles.chipValue, { color: family.ink }]}>{xp.level}</Text>
                        </Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: family.card }]}>
                        <Text style={[styles.chipText, { color: family.inkSoft }]}>
                          <Text style={[styles.chipValue, { color: family.ink }]}>{xp.totalXP.toLocaleString()}</Text> XP
                        </Text>
                      </View>
                      <View style={[styles.chip, { backgroundColor: family.card }]}>
                        <Text style={[styles.chipText, { color: family.inkSoft }]}>
                          <Text style={[styles.chipValue, { color: family.ink }]}>{xp.hearts}</Text> hearts
                        </Text>
                      </View>
                    </>
                  ) : null}
                  <View style={[styles.chip, { backgroundColor: family.card }]}>
                    <Text style={[styles.chipText, { color: family.inkSoft }]}>
                      Started <Text style={[styles.chipValue, { color: family.ink }]}>{dayLabel(fast.startDate)}</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* The year, day by day. */}
              <SectionHead family={family} title="The Year, Day by Day" />
              <View style={[styles.card, { backgroundColor: family.card, shadowColor: family.shadow }]}>
                {grid.map((month) => (
                  <View key={month.label} style={styles.monthRow}>
                    <Text style={[styles.monthLabel, { color: family.inkSoft }]}>{month.label}</Text>
                    <View style={styles.dots}>
                      {month.days.map((d) =>
                        d.state === "today" ? (
                          <View
                            key={d.date}
                            style={[styles.dot, styles.dotToday, { backgroundColor: family.card, borderColor: family.ink }]}
                          />
                        ) : (
                          <View
                            key={d.date}
                            style={[
                              styles.dot,
                              { backgroundColor: DOT_COLORS[d.state] || family.wash2 },
                            ]}
                          />
                        ),
                      )}
                    </View>
                  </View>
                ))}
                <View style={styles.legend}>
                  <LegendDot color="#3E9B4F" label="Held" family={family} />
                  <LegendDot color="#E8A33D" label="Close call" family={family} />
                  <LegendDot color="#D64541" label="Fell" family={family} />
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, styles.dotToday, { backgroundColor: family.card, borderColor: family.ink }]} />
                    <Text style={[styles.legendText, { color: family.inkSoft }]}>Today</Text>
                  </View>
                  <LegendDot color={family.wash2} label="Still to come" family={family} />
                </View>
              </View>

              {highs.length > 0 ? (
                <>
                  <SectionHead family={family} title="Highs" />
                  <RowsCard family={family} rows={highs} />
                </>
              ) : null}

              {lows.length > 0 ? (
                <>
                  <SectionHead family={family} title="Lows" />
                  <RowsCard family={family} rows={lows} />
                </>
              ) : null}

              <SectionHead family={family} title="Everything In-Between" />
              <View style={styles.tiles}>
                <Tile family={family} value={String(writtenTotal)} label="Books written on" />
                <Tile family={family} value={String(stats.logged)} label="Days in the fast log" />
                <Tile family={family} value={xp ? xp.totalXP.toLocaleString() : "0"} label="XP earned" />
                <Tile family={family} value={xp ? String(xp.level) : "0"} label="Level reached" />
                <Tile family={family} value={String(peopleCount)} label="People on the list" />
                <Tile family={family} value={xp ? String(xp.hearts) : "0"} label="Hearts in hand" />
              </View>

              <View style={[styles.closing, { backgroundColor: family.container }]}>
                <Text style={[styles.closingKicker, { color: family.deep }]}>Where It Stands</Text>
                <Text style={[styles.closingText, { color: family.ink }]}>
                  {stats.remaining > 0
                    ? `${stats.remaining} days left in the year. The review fills in as you go — nothing here is written at the end; it's been keeping itself all along.`
                    : `The year is complete — all ${stats.total} days are in the record, and this review stays here under Recaps whenever you want it.`}
                </Text>
              </View>
            </>
          ) : null}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

function SectionHead({ family, title }: { family: PeopleFrontDoorFamily; title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: family.inkSoft }]}>{title}</Text>
    </View>
  );
}

function RowsCard({ family, rows }: { family: PeopleFrontDoorFamily; rows: YearReviewRow[] }) {
  return (
    <View style={[styles.rowsCard, { backgroundColor: family.card, shadowColor: family.shadow }]}>
      {rows.map((row, i) => {
        const tone = ROW_TONES[row.icon];
        return (
          <View
            key={`${row.title}-${i}`}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: family.line }]}
          >
            <View style={[styles.medallion, { backgroundColor: tone.bg }]}>
              <MaterialIcons name={tone.glyph as keyof typeof MaterialIcons.glyphMap} size={17} color={tone.ink} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: family.ink }]}>{row.title}</Text>
              <Text style={[styles.rowSub, { color: family.inkSoft }]}>{row.sub}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function LegendDot({ color, label, family }: { color: string; label: string; family: PeopleFrontDoorFamily }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendText, { color: family.inkSoft }]}>{label}</Text>
    </View>
  );
}

function Tile({ family, value, label }: { family: PeopleFrontDoorFamily; value: string; label: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: family.container }]}>
      <Text style={[styles.tileValue, { color: family.ink }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: family.inkSoft }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, paddingTop: 14, paddingBottom: 40 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
  headChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  headChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "800", marginTop: 14 },
  assembled: { fontSize: 12.5, marginTop: 3 },
  hero: { borderRadius: 18, padding: 18, marginTop: 16 },
  heroCount: { fontSize: 54, fontWeight: "800", lineHeight: 58 },
  heroCap: { fontSize: 12.5, fontWeight: "600", marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 13 },
  chip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 11.5, fontWeight: "600" },
  chipValue: { fontWeight: "800" },
  sectionHead: { marginTop: 24, marginBottom: 9, paddingHorizontal: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  monthRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  monthLabel: { width: 34, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, paddingTop: 1 },
  dots: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 3.5 },
  dot: { width: 6.5, height: 6.5, borderRadius: 3.25 },
  dotToday: { borderWidth: 1.5 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 10.5, fontWeight: "600" },
  rowsCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 11 },
  medallion: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 13.5, fontWeight: "800" },
  rowSub: { fontSize: 11.5, marginTop: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  tile: { width: "48%", flexGrow: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 },
  tileValue: { fontSize: 20, fontWeight: "800" },
  tileLabel: { fontSize: 10.5, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 1 },
  closing: { borderRadius: 16, padding: 16, marginTop: 22 },
  closingKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  closingText: { fontSize: 13.5, fontWeight: "600", lineHeight: 20, marginTop: 5 },
});
