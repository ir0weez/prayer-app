import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useMemo, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Rect } from "react-native-svg";

import { AvatarImage } from "@/components/avatar-system";
import { JournalEntrance } from "@/components/journal-entrance";
import { JournalPost, type JournalAuthor } from "@/components/journal-post";
import { PaperSettle } from "@/components/paper-motion";
import { BitSettle } from "@/components/bit-motion";
import { MoodFace, moodFaceColor } from "@/components/mood-face";
import { MOODS } from "@/components/mood-picker";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import {
  contributionGrid,
  DAY_PARTS,
  entriesForPerson,
  entriesForTag,
  formatMonthYear,
  isoDateOf,
  lastSharedEntry,
  monthLabelsForGrid,
  paintedDays,
  placeNameForTag,
  parseIsoDate,
  sharedDatesFor,
  tagIndex,
} from "@/lib/journal-moments";
import { useJournalMaterial } from "@/hooks/use-journal-material";
import type { Person } from "@/lib/prayercircle-data";
import { formatPrayerJournalDate, type PrayerJournalEntry, type PrayerJournalReply } from "@/lib/prayer-journal";
import { TERM_MID, TERM_PANEL, TERM_PHOS, TERM_SOFT, skinText } from "@/lib/skin-themes";

// v194 (Journal, Zeitgeist): the three sheets from the mockup — a
// person profile modeled on Zeitgeist's Anna page, a tag page modeled
// on its "Time Outdoors" page, and the painted mood calendar. All of
// it is drawn from data the app already keeps: shared entries are the
// entries that tag or @mention the person; "last together" is simply
// the newest of those, stated plainly when there are none.

type SheetCallbacks = {
  author: JournalAuthor;
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onOpenTag: (tag: string) => void;
  onShowActions: (entry: PrayerJournalEntry) => void;
  onReplyLongPress: (entry: PrayerJournalEntry, reply: PrayerJournalReply) => void;
  /** v281 (D8): the post footer's bookmark toggle. */
  onToggleBookmark?: (entry: PrayerJournalEntry) => void;
};

function SheetShell({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  return (
    <Modal transparent visible={visible} animationType={skinTokens.isPaper ? "fade" : "slide"} onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        {/* v202: under Paper the sheet is a page laid down over the
            feed (fade + settle); other skins keep the slide. */}
        <PaperSettle style={[styles.sheet, { backgroundColor: isSkinned ? skinTokens.background ?? colors.background : colors.background }]}>
<BitSettle style={{ flex: 1 }}>
        <SafeAreaView
          edges={["top", "bottom"]}
          style={{ flex: 1 }}
        >
          <View style={styles.sheetHead}>
            <View style={[styles.grab, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: skinTokens.isTerminal ? TERM_SOFT : colors.foreground }]}>{title}</Text>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={({ pressed }) => [styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
              <MaterialIcons name="close" size={20} color={skinTokens.isTerminal ? TERM_PHOS : colors.foreground} />
            </Pressable>
          </View>
          {children}
        </SafeAreaView>
        </BitSettle>
</PaperSettle>
      </View>
    </Modal>
  );
}

export function ContribCalendar({ dates, stamp, endIso }: { dates: Set<string>; stamp: string; endIso: string }) {
  const grid = useMemo(() => contributionGrid(dates, endIso, 18), [dates, endIso]);
  const labels = useMemo(() => monthLabelsForGrid(grid), [grid]);
  return (
    <View style={styles.contribWrap}>
      <View style={styles.contrib}>
        {grid.map((column, colIndex) => (
          <View key={colIndex} style={styles.contribCol}>
            {column.map((cell, rowIndex) =>
              cell === null ? (
                <View key={rowIndex} style={[styles.cc, styles.ccBlank]} />
              ) : (
                <View key={rowIndex} style={[styles.cc, cell.stamped ? styles.ccStamp : styles.ccEmpty]}>
                  {cell.stamped ? <Text style={styles.ccStampText}>{stamp}</Text> : null}
                </View>
              ),
            )}
          </View>
        ))}
      </View>
      <View style={styles.monthLabels}>
        {labels.map((label) => (
          <Text key={`${label.column}-${label.label}`} style={[styles.monthLabel, { left: label.column * 15 }]}>
            {label.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Person profile ──────────────────────────────────────────────────────────

export function PersonSheet({
  person,
  entries,
  onClose,
  ...callbacks
}: { person: Person | null; entries: PrayerJournalEntry[]; onClose: () => void } & SheetCallbacks) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const jm = useJournalMaterial();
  const [tab, setTab] = useState<"entries" | "notes">("entries");
  const todayIso = isoDateOf(new Date());

  const shared = useMemo(() => (person ? entriesForPerson(entries, person) : []), [entries, person]);
  const last = useMemo(() => (person ? lastSharedEntry(entries, person) : null), [entries, person]);
  const sharedDates = useMemo(() => (person ? sharedDatesFor(entries, person) : new Set<string>()), [entries, person]);

  if (!person) return null;
  const ink = skinTokens.isTerminal ? TERM_SOFT : colors.foreground;
  const faint = skinTokens.isTerminal ? TERM_MID : colors.muted;
  const snippet = last ? last.body.replace(/\s+/g, " ").slice(0, 60) : "";

  return (
    <SheetShell visible onClose={onClose} title={person.name}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.hero}>
          <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={96} fallbackColor={person.avatarColor} />
          <Text style={[styles.heroName, { color: ink }, skinText(skinTokens, skinTokens.type.cardTitle)]}>{person.name}</Text>
          <Text style={[styles.heroLine, { color: faint }]}>
            {last ? (
              <>
                Last together: <Text style={{ color: ink, fontWeight: "700" }}>{formatPrayerJournalDate(last.date)}</Text>
                {snippet ? ` · ${snippet}${last.body.length > 60 ? "…" : ""}` : ""}
              </>
            ) : (
              "No shared moments yet — tag them in an entry, or @mention them, and the moments gather here."
            )}
          </Text>
          <Text style={[styles.heroSub, { color: faint }]}>
            {shared.length} shared {shared.length === 1 ? "moment" : "moments"}
          </Text>
        </View>

        <ContribCalendar dates={sharedDates} stamp={(person.initials[0] ?? person.name[0] ?? "•").toUpperCase()} endIso={todayIso} />

        <View style={[styles.seg, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.tonal }]}>
          {(["entries", "notes"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setTab(value)}
              style={[styles.segBtn, tab === value && { backgroundColor: jm.card, shadowColor: "#1E1246", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 }]}
            >
              <Text style={[styles.segText, { color: tab === value ? ink : faint }]}>{value === "entries" ? "Entries" : "Notes"}</Text>
            </Pressable>
          ))}
        </View>

        {tab === "entries" ? (
          shared.length > 0 ? (
            shared.map((entry) => (
              <JournalPost key={entry.id} entry={entry} avatarMode="mood" {...callbacks} />
            ))
          ) : (
            <Text style={[styles.quietNote, { color: faint }]}>Nothing shared yet.</Text>
          )
        ) : (
          <View>
            {person.prayerNote ? (
              <JournalEntrance index={0}>
                <View style={[styles.noteCard, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.card, borderColor: skinTokens.isTerminal ? TERM_MID : jm.line }]}>
                  <Text style={[styles.noteKind, { color: skinTokens.isTerminal ? TERM_PHOS : jm.deep }]}>Prayer note</Text>
                  <Text style={[styles.noteBody, { color: ink }]}>{person.prayerNote}</Text>
                </View>
              </JournalEntrance>
            ) : null}
            {person.praiseNote ? (
              // v252: the Journal's praise surface wears the
              // mockup's gold treatment — gold-washed card, gold
              // edge, gold-deep kind label, and the emphasis
              // entrance. The gold is the app's praise constant,
              // never the seed (lib/journal-material).
              <JournalEntrance index={1} emphasis>
                <View style={[styles.noteCard, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.goldTint, borderColor: skinTokens.isTerminal ? TERM_MID : jm.gold }]}>
                  <Text style={[styles.noteKind, { color: skinTokens.isTerminal ? TERM_PHOS : jm.goldDeep }]}>Praise</Text>
                  <Text style={[styles.noteBody, { color: ink }]}>{person.praiseNote}</Text>
                </View>
              </JournalEntrance>
            ) : null}
            {person.prayerItems.map((item, itemIndex) => (
              <JournalEntrance key={item.id} index={itemIndex + 2}>
                <View style={[styles.noteCard, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.card, borderColor: skinTokens.isTerminal ? TERM_MID : jm.line }]}>
                  <Text style={[styles.noteKind, { color: skinTokens.isTerminal ? TERM_PHOS : jm.deep }]}>
                    {item.isEmergency ? "Emergency prayer" : item.isUrgent ? "Urgent prayer" : "Prayer item"}
                  </Text>
                  <Text style={[styles.noteBody, { color: ink, textDecorationLine: item.isDone ? "line-through" : "none" }]}>{item.title}</Text>
                  <Text style={[styles.noteFoot, { color: item.isDone && !skinTokens.isTerminal ? jm.goldDeep : faint }]}>{item.isDone ? "Answered" : "Still praying"}</Text>
                </View>
              </JournalEntrance>
            ))}
            {!person.prayerNote && !person.praiseNote && person.prayerItems.length === 0 ? (
              <Text style={[styles.quietNote, { color: faint }]}>No prayer notes for {person.name.split(/\s+/)[0]} yet — they live on their People page.</Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SheetShell>
  );
}

// ─── Tag page ────────────────────────────────────────────────────────────────

function GardenTree() {
  return (
    <Svg width={168} height={120} viewBox="0 0 168 138">
      <Circle cx={34} cy={34} r={13} fill="#A9CF96" opacity={0.5} />
      <Circle cx={136} cy={28} r={10} fill="#A9CF96" opacity={0.45} />
      <Circle cx={148} cy={66} r={12} fill="#A9CF96" opacity={0.4} />
      <Circle cx={18} cy={72} r={9} fill="#A9CF96" opacity={0.45} />
      <Rect x={79} y={88} width={10} height={34} rx={4} fill="#8A6844" />
      <Circle cx={84} cy={52} r={34} fill="#5E9C4A" />
      <Circle cx={56} cy={66} r={24} fill="#6FAE57" />
      <Circle cx={112} cy={66} r={24} fill="#4E8A3E" />
      <Circle cx={84} cy={34} r={22} fill="#79BC63" />
      <Circle cx={66} cy={46} r={15} fill="#8CCB77" />
      <Circle cx={102} cy={44} r={14} fill="#6FAE57" />
    </Svg>
  );
}

export function TagSheet({
  tag,
  entries,
  onClose,
  ...callbacks
}: { tag: string | null; entries: PrayerJournalEntry[]; onClose: () => void } & SheetCallbacks) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const todayIso = isoDateOf(new Date());
  const stats = useMemo(() => (tag ? tagIndex(entries).get(tag) : undefined), [entries, tag]);
  const tagged = useMemo(() => (tag ? entriesForTag(entries, tag) : []), [entries, tag]);

  if (!tag) return null;
  const ink = skinTokens.isTerminal ? TERM_SOFT : colors.foreground;
  const faint = skinTokens.isTerminal ? TERM_MID : colors.muted;
  // v204: a place's page wears the place's real name — the token
  // (#WestParkElementary) is just the key the page is filed under.
  const title = placeNameForTag(entries, tag) ?? (tag.length > 0 ? tag[0].toUpperCase() + tag.slice(1) : tag);
  const isGarden = tag === "garden";

  return (
    <SheetShell visible onClose={onClose} title={title}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.hero}>
          {isGarden ? (
            <GardenTree />
          ) : (
            <View style={[styles.tagBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name="sell" size={40} color="#FFFFFF" />
            </View>
          )}
          <Text style={[styles.heroName, { color: ink }, skinText(skinTokens, skinTokens.type.cardTitle)]}>{title}</Text>
          <Text style={[styles.heroLine, { color: faint }]}>
            {stats ? (
              <>
                <Text style={{ color: ink, fontWeight: "700" }}>{stats.count} {stats.count === 1 ? "moment" : "moments"}</Text>
                {" · "}{formatMonthYear(stats.firstDate)} – {formatMonthYear(stats.lastDate)}
              </>
            ) : (
              "No moments with this tag yet."
            )}
          </Text>
          <Text style={[styles.heroSub, { color: faint }]}>Tap a tag anywhere and its days gather like this — see what you've been making time for.</Text>
        </View>

        {stats ? <ContribCalendar dates={stats.dates} stamp={title[0]} endIso={todayIso} /> : null}

        {tagged.map((entry) => (
          <JournalPost key={entry.id} entry={entry} avatarMode="mood" {...callbacks} />
        ))}
      </ScrollView>
    </SheetShell>
  );
}

// ─── Painted mood calendar ───────────────────────────────────────────────────

export function CalendarSheet({
  visible,
  entries,
  onClose,
  onSelectDay,
  onLogMood,
}: {
  visible: boolean;
  entries: PrayerJournalEntry[];
  onClose: () => void;
  onSelectDay: (date: string) => void;
  onLogMood: (moodId: string) => void;
}) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const jm = useJournalMaterial();
  const now = new Date();
  const [monthCursor, setMonthCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const todayIso = isoDateOf(now);
  const painted = useMemo(() => paintedDays(entries), [entries]);

  const ink = skinTokens.isTerminal ? TERM_SOFT : colors.foreground;
  const faint = skinTokens.isTerminal ? TERM_MID : colors.muted;

  const firstOfMonth = new Date(monthCursor.year, monthCursor.month, 1);
  const startOffset = firstOfMonth.getDay();
  const daysInMonth = new Date(monthCursor.year, monthCursor.month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => isoDateOf(new Date(monthCursor.year, monthCursor.month, index + 1))),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const moveMonth = (delta: number) => {
    setMonthCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  return (
    <SheetShell visible={visible} onClose={onClose} title="Calendar">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.pcalHead}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={[styles.pcalTitle, { color: ink }]}>
              {firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable accessibilityLabel="Previous month" onPress={() => moveMonth(-1)} style={({ pressed }) => [styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                <MaterialIcons name="chevron-left" size={20} color={ink} />
              </Pressable>
              <Pressable accessibilityLabel="Next month" onPress={() => moveMonth(1)} style={({ pressed }) => [styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}>
                <MaterialIcons name="chevron-right" size={20} color={ink} />
              </Pressable>
            </View>
          </View>
          <Text style={[styles.pcalSub, { color: faint }]}>
            Every day paints in three — morning, midday, evening — because a day can start rough and end great. Tap a day to open it.
          </Text>
        </View>

        <View style={styles.pcalDow}>
          {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((label) => (
            <Text key={label} style={[styles.pcalDowText, { color: faint }]}>{label}</Text>
          ))}
        </View>
        <View style={styles.pcalGrid}>
          {cells.map((iso, index) =>
            iso === null ? (
              <View key={`blank-${index}`} style={[styles.pday, styles.pdayBlank]} />
            ) : (
              <Pressable
                key={iso}
                onPress={() => onSelectDay(iso)}
                style={({ pressed }) => [
                  styles.pday,
                  {
                    backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.card,
                    borderColor: iso === todayIso ? colors.primary : colors.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.pdNum, { color: iso === todayIso ? colors.primary : faint }]}>{parseIsoDate(iso).getDate()}</Text>
                <View style={styles.segRow}>
                  {DAY_PARTS.map((part) => (
                    <View
                      key={part}
                      style={[styles.segPill, { backgroundColor: painted.get(iso)?.[part] ? moodFaceColor(painted.get(iso)?.[part]) : skinTokens.isTerminal ? "#123B1E" : "#E9E6F2" }]}
                    />
                  ))}
                </View>
                <View style={styles.segRow}>
                  {["AM", "MID", "PM"].map((label) => (
                    <Text key={label} style={[styles.segLabel, { color: faint }]}>{label}</Text>
                  ))}
                </View>
              </Pressable>
            ),
          )}
        </View>

        <View style={styles.legend}>
          {MOODS.map((mood) => (
            <View key={mood.id} style={styles.legendItem}>
              <MoodFace moodId={mood.id} size={14} />
              <Text style={[styles.legendText, { color: faint }]}>{mood.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.logRow}>
          <Text style={[styles.logLabel, { color: faint }]}>Right now feels like… (tap one — logging a mood needs no entry)</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {MOODS.map((mood) => (
              <Pressable
                key={mood.id}
                accessibilityLabel={`Log mood: ${mood.label}`}
                onPress={() => onLogMood(mood.id)}
                style={({ pressed }) => [styles.faceBtn, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.tonal }, pressed && styles.pressed]}
              >
                <MoodFace moodId={mood.id} size={26} />
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </SheetShell>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(24,12,50,0.28)" },
  sheet: { height: "94%", borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: "hidden" },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  grab: { position: "absolute", top: 6, left: "50%", marginLeft: -19, width: 38, height: 4.5, borderRadius: 99 },
  sheetTitle: { fontSize: 15, fontWeight: "800", flex: 1 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  hero: { alignItems: "center", paddingHorizontal: 24, paddingTop: 8, paddingBottom: 2 },
  heroName: { fontSize: 27, fontWeight: "800", marginTop: 10, letterSpacing: -0.3, textAlign: "center" },
  heroLine: { fontSize: 13.5, marginTop: 3, lineHeight: 19, textAlign: "center" },
  heroSub: { fontSize: 12.5, marginTop: 2, fontWeight: "600", textAlign: "center" },
  tagBadge: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  contribWrap: { paddingHorizontal: 16, paddingTop: 14 },
  contrib: { flexDirection: "row", gap: 3 },
  contribCol: { gap: 3 },
  cc: { width: 12, height: 12, borderRadius: 3.5, alignItems: "center", justifyContent: "center" },
  ccBlank: { backgroundColor: "transparent" },
  ccEmpty: { backgroundColor: "#F1EFF7" },
  ccStamp: { backgroundColor: "#DFF0DC" },
  ccStampText: { fontSize: 8, fontWeight: "800", color: "#3E7A34", lineHeight: 10 },
  monthLabels: { position: "relative", height: 18, marginTop: 5 },
  monthLabel: { position: "absolute", fontSize: 11, fontWeight: "600", color: "#9A92B5" },
  seg: { flexDirection: "row", borderRadius: 999, padding: 3, marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center" },
  segText: { fontSize: 14, fontWeight: "700" },
  noteCard: { marginHorizontal: 16, marginTop: 12, borderWidth: 1, borderRadius: 16, padding: 13 },
  noteKind: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  noteBody: { fontSize: 14, lineHeight: 21 },
  noteFoot: { fontSize: 12, marginTop: 8, fontWeight: "600" },
  quietNote: { fontSize: 13.5, lineHeight: 19, textAlign: "center", paddingHorizontal: 28, paddingVertical: 18 },
  pcalHead: { paddingHorizontal: 20, paddingTop: 4 },
  pcalTitle: { fontSize: 22, fontWeight: "800" },
  pcalSub: { fontSize: 13, lineHeight: 19, marginTop: 4 },
  pcalDow: { flexDirection: "row", paddingHorizontal: 16, marginTop: 14, marginBottom: 5 },
  pcalDowText: { flex: 1, fontSize: 10.5, fontWeight: "800", textAlign: "center", letterSpacing: 0.6 },
  pcalGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 5 },
  pday: {
    width: "12.8%",
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: 11,
    padding: 5,
    minHeight: 52,
    gap: 3,
  },
  pdayBlank: { backgroundColor: "transparent", borderColor: "transparent" },
  pdNum: { fontSize: 11.5, fontWeight: "800" },
  segRow: { flexDirection: "row", gap: 2.5 },
  segPill: { flex: 1, height: 7, borderRadius: 99 },
  segLabel: { flex: 1, fontSize: 7, fontWeight: "800", textAlign: "center" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 20, paddingTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { fontSize: 12, fontWeight: "600" },
  logRow: { paddingHorizontal: 20, paddingTop: 16 },
  logLabel: { fontSize: 12.5, fontWeight: "700", marginBottom: 8 },
  faceBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
