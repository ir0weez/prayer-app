import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Ellipse, Path, Rect, Text as SvgText } from "react-native-svg";

import { JournalPost, type JournalAuthor } from "@/components/journal-post";
import { MoodFace } from "@/components/mood-face";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import {
  addDaysToIso,
  buildDayTimeline,
  dayCounts,
  formatDaySub,
  formatDayTitle,
  formatEventTimeRange,
  isoDateOf,
  paintedDays,
  placesPathFor,
  DAY_PARTS,
  type PlaceIconHint,
  type PlaceNode,
} from "@/lib/journal-moments";
import { useJournalMaterial } from "@/hooks/use-journal-material";
import { hexToRgba } from "@/lib/bible-v205/palette-accents";
import type { Person } from "@/lib/prayercircle-data";
import type { PrayerJournalEntry, PrayerJournalReply } from "@/lib/prayer-journal";
import { getActiveFast, getCurrentFastDay, type PersonalFast } from "@/lib/prayercircle-fasting";
import type { ScheduleEvent } from "@/lib/schedule-data";
import { BIT_PANEL, TERM_MID, TERM_PANEL, TERM_PHOS, TERM_SOFT, skinText } from "@/lib/skin-themes";

// v194 (Journal, Zeitgeist): the Day overview — "your whole day,
// without writing it all down." The header is THE PLACES PATH
// (Jonathan's pick from the day-headers mockups, Variant A): the
// drawn route through the day's places in schedule order, fed only
// by locations the Schedule itself carries — nothing tracked,
// nothing invented. The current place is lit with a NOW marker,
// computed from the schedule and the clock each time the screen
// renders (no background timers, per his standing rule); stops
// already passed are dim, the ones ahead plain. A day whose schedule
// names no places settles to a single Home node rather than an
// empty box. Below the path the day assembles itself from data the
// app truly has: entries and Schedule events interleaved in time
// order, the day's photos gathered into one row, and the day's fast
// state. Zeitgeist's steps/sleep/weather rows are omitted — the app
// does not track them, and invented numbers would be worse than
// absence.

type JournalDayProps = {
  date: string;
  entries: PrayerJournalEntry[];
  events: ScheduleEvent[];
  fasts: PersonalFast[];
  author: JournalAuthor;
  people: Person[];
  onBack: () => void;
  onChangeDate: (date: string) => void;
  onOpenPerson: (personId: string) => void;
  onOpenTag: (tag: string) => void;
  onShowActions: (entry: PrayerJournalEntry) => void;
  onReplyLongPress: (entry: PrayerJournalEntry, reply: PrayerJournalReply) => void;
  /** v281 (D8): the post footer's bookmark toggle. */
  onToggleBookmark?: (entry: PrayerJournalEntry) => void;
};

const BAND_W = 392;
const BAND_H = 226;
// The mockup's five anchor stops (x, node top) across the band.
const ANCHORS: { x: number; top: number }[] = [
  { x: 48, top: 130 },
  { x: 138, top: 64 },
  { x: 222, top: 108 },
  { x: 300, top: 50 },
  { x: 352, top: 98 },
];

function anchorFor(index: number, count: number): { x: number; top: number } {
  if (count <= 1) return { x: BAND_W / 2, top: 92 };
  return ANCHORS[Math.round((index * (ANCHORS.length - 1)) / (count - 1))];
}

// A smooth dashed route through the pin centers (Catmull-Rom →
// cubic), the way the mockup's purple route winds between stops.
function routePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const PLACE_ICONS: Record<PlaceIconHint, string> = {
  home: "home",
  school: "menu-book",
  heart: "favorite",
  booth: "mic",
  church: "church",
  place: "place",
};

// v281 (D12): the path's CHROME violet derives from the journal
// family's seed-deep (passed in as `accent`) — the route, the NOW
// pin's border and halo, its name and pill all re-tone with the
// palette. The land/water pastels below are the place's PICTURE,
// not chrome, and stay as drawn.
function PlaceNodeView({ node, anchor, accent }: { node: PlaceNode; anchor: { x: number; top: number }; accent: string }) {
  const isNow = node.state === "now";
  const pin = (
    <View style={[styles.ppPin, isNow && { borderColor: accent }]}>
      <MaterialIcons
        name={PLACE_ICONS[node.iconHint] as never}
        size={20}
        color={isNow ? accent : "#5E5875"}
      />
    </View>
  );
  return (
    <View
      style={[
        styles.ppNode,
        {
          left: `${((anchor.x - 37) / BAND_W) * 100}%`,
          top: anchor.top,
          opacity: node.state === "past" ? 0.55 : 1,
        },
      ]}
    >
      {isNow ? <View style={[styles.ppRing, { borderColor: hexToRgba(accent, 0.28) }]}>{pin}</View> : pin}
      <Text style={[styles.ppName, isNow && { color: accent }]} numberOfLines={1}>
        {node.location}
      </Text>
      {node.timeLabel ? <Text style={styles.ppTime}>{node.timeLabel}</Text> : null}
      {isNow ? (
        <View style={[styles.ppNow, { backgroundColor: accent }]}>
          <Text style={styles.ppNowText}>Now</Text>
        </View>
      ) : null}
    </View>
  );
}

function PlacesPathBand({ events, date, accent }: { events: ScheduleEvent[]; date: string; accent: string }) {
  // "Live" at render: the path and its NOW marker are computed from
  // the day's schedule and the current time whenever the Day opens
  // or re-renders — the app runs no background timers.
  const path = useMemo(() => placesPathFor(events, date, new Date()), [events, date]);
  const anchors = path.nodes.map((_, index) => anchorFor(index, path.nodes.length));
  const centers = anchors.map((anchor) => ({ x: anchor.x, y: anchor.top + 20 }));

  return (
    <View style={styles.band}>
      <Svg width="100%" height={BAND_H} viewBox={`0 0 ${BAND_W} ${BAND_H}`} preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Rect width={BAND_W} height={BAND_H} fill="#EAF2E5" />
        <Ellipse cx={60} cy={40} rx={90} ry={40} fill="#CDE6BC" />
        <Ellipse cx={336} cy={180} rx={96} ry={52} fill="#CDE6BC" />
        <Ellipse cx={196} cy={216} rx={70} ry={30} fill="#D8EDCB" />
        <Path d="M-10 168 C 90 148, 150 186, 240 146 S 360 96, 404 112" stroke="#B9D9F2" strokeWidth={11} fill="none" strokeLinecap="round" />
        <Path d="M30 -10 L140 236 M118 -10 L224 236 M-10 74 L402 50 M-10 128 L402 152" stroke="#C9C2B4" strokeWidth={9} fill="none" />
        <Path d="M30 -10 L140 236 M118 -10 L224 236 M-10 74 L402 50 M-10 128 L402 152" stroke="#FFFFFF" strokeWidth={5.5} fill="none" />
        {centers.length > 1 ? (
          <Path d={routePath(centers)} stroke={accent} strokeWidth={2.5} fill="none" strokeDasharray="6 6" opacity={0.7} />
        ) : null}
        <SvgText x={24} y={30} fontSize={10.5} fontWeight="700" fill="#7C8A70">ANTELOPE VALLEY</SvgText>
        <SvgText x={252} y={212} fontSize={10.5} fontWeight="700" fill="#7C8A70">LANCASTER</SvgText>
      </Svg>
      {path.nodes.map((node, index) => (
        <PlaceNodeView key={node.key} node={node} anchor={anchors[index]} accent={accent} />
      ))}
      {path.homeOnly ? <Text style={styles.bandCaption}>A home day — no places on the schedule</Text> : null}
    </View>
  );
}

export function JournalDay({
  date,
  entries,
  events,
  fasts,
  author,
  people,
  onBack,
  onChangeDate,
  onOpenPerson,
  onOpenTag,
  onShowActions,
  onReplyLongPress,
  onToggleBookmark,
}: JournalDayProps) {
  const colors = useColors();
  const { tokens: skinTokens } = useSkin();
  const jm = useJournalMaterial();
  const todayIso = isoDateOf(new Date());

  const counts = useMemo(() => dayCounts(entries, events, date), [entries, events, date]);
  const timeline = useMemo(() => buildDayTimeline(entries, events, date), [entries, events, date]);
  const painted = useMemo(() => paintedDays(entries).get(date), [entries, date]);
  const fast = useMemo(() => getActiveFast(fasts, date), [fasts, date]);

  const ink = skinTokens.isTerminal ? TERM_SOFT : colors.foreground;
  const faint = skinTokens.isTerminal ? TERM_MID : colors.muted;
  // v281 (D12): the day view's chips wear the journal family's
  // derived pairs — the count chips take the same meaning-hue
  // pairs as the Today strip, the fast chip takes the family's
  // teal tint pair, the mood chip the tonal pair. The pinned
  // pastel washes are gone; Terminal/8-bit keep their panel dress.
  const chipPair = (bg: string, inkOn: string) =>
    skinTokens.isTerminal
      ? { bg: TERM_PANEL, ink: TERM_PHOS }
      : skinTokens.isEightBit
        ? { bg: BIT_PANEL, ink: colors.foreground }
        : { bg, ink: inkOn };
  const entriesPair = chipPair(jm.entriesChipBg, jm.entriesChipInk);
  const photosPair = chipPair(jm.photosChipBg, jm.photosChipInk);
  const eventsPair = chipPair(jm.eventsChipBg, jm.eventsChipInk);
  const fastPair = chipPair(jm.tealTint, jm.tealTintInk);
  const moodPairBg = chipPair(jm.tonal, jm.tonalInk).bg;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View>
          <PlacesPathBand events={events} date={date} accent={jm.deep} />
          <Pressable
            accessibilityLabel="Back to Moments"
            onPress={onBack}
            style={({ pressed }) => [styles.roundBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <MaterialIcons name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        <Text style={[styles.dayTitle, { color: ink }, skinText(skinTokens, skinTokens.type.screenTitle)]}>{formatDayTitle(date, todayIso)}</Text>
        <Text style={[styles.daySub, { color: faint }]}>{formatDaySub(date)} · the whole day, gathered on its own</Text>

        <View style={styles.chipsCloud}>
          <View style={[styles.dchip, { backgroundColor: entriesPair.bg }]}>
            <MaterialIcons name="edit" size={15} color={entriesPair.ink} />
            <Text style={[styles.dchipText, { color: entriesPair.ink }]}>{counts.entries} {counts.entries === 1 ? "entry" : "entries"}</Text>
          </View>
          {counts.photos > 0 ? (
            <View style={[styles.dchip, { backgroundColor: photosPair.bg }]}>
              <MaterialIcons name="photo-camera" size={15} color={photosPair.ink} />
              <Text style={[styles.dchipText, { color: photosPair.ink }]}>{counts.photos} {counts.photos === 1 ? "photo" : "photos"}</Text>
            </View>
          ) : null}
          {counts.events > 0 ? (
            <View style={[styles.dchip, { backgroundColor: eventsPair.bg }]}>
              <MaterialIcons name="event" size={15} color={eventsPair.ink} />
              <Text style={[styles.dchipText, { color: eventsPair.ink }]}>{counts.events} {counts.events === 1 ? "event" : "events"}</Text>
            </View>
          ) : null}
          {fast ? (
            <View style={[styles.dchip, { backgroundColor: fastPair.bg }]}>
              <MaterialIcons name="local-fire-department" size={15} color={fastPair.ink} />
              <Text style={[styles.dchipText, { color: fastPair.ink }]}>Fasting · day {getCurrentFastDay(fast, date)} of {fast.durationDays}</Text>
            </View>
          ) : null}
          {painted ? (
            <View style={[styles.dchip, { backgroundColor: moodPairBg }]}>
              {DAY_PARTS.map((part) => (painted[part] ? <MoodFace key={part} moodId={painted[part]} size={17} /> : null))}
              <Text style={[styles.dchipText, { color: faint, fontSize: 11.5 }]}>morning · midday · evening</Text>
            </View>
          ) : null}
        </View>

        {timeline.length === 0 ? (
          <View style={styles.emptyDay}>
            <MaterialIcons name="auto-stories" size={28} color={faint} />
            <Text style={[styles.emptyDayText, { color: faint }]}>Nothing gathered here yet — the day is still quiet.</Text>
          </View>
        ) : (
          timeline.map((item) => {
            if (item.kind === "entry") {
              return (
                <JournalPost
                  key={`entry-${item.entry.id}`}
                  entry={item.entry}
                  author={author}
                  people={people}
                  onOpenPerson={onOpenPerson}
                  onOpenTag={onOpenTag}
                  onShowActions={onShowActions}
                  onReplyLongPress={onReplyLongPress}
                  onToggleBookmark={onToggleBookmark}
                  hidePhotos
                />
              );
            }
            if (item.kind === "event") {
              return (
                <View key={`event-${item.event.id}`} style={[styles.eventTile, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.tonal }]}>
                  <View style={[styles.eventIcon, { backgroundColor: skinTokens.isTerminal ? "transparent" : jm.card }]}>
                    <MaterialIcons name="event" size={19} color={skinTokens.isTerminal ? TERM_PHOS : colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.eventTitle, { color: ink }]}>{item.event.title}</Text>
                    <Text style={[styles.eventSub, { color: faint }]}>
                      {formatEventTimeRange(item.event)}{item.event.location ? ` · ${item.event.location}` : ""} · from your Schedule
                    </Text>
                  </View>
                  <View style={[styles.autoTag, { backgroundColor: skinTokens.isTerminal ? TERM_PHOS : colors.primary }]}>
                    <Text style={[styles.autoTagText, { color: skinTokens.isTerminal ? "#041207" : "#FFFFFF" }]}>Auto</Text>
                  </View>
                </View>
              );
            }
            return (
              <View key="photos-row" style={[styles.drow, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.card }]}>
                <View style={[styles.dIcon, { backgroundColor: skinTokens.isTerminal ? "transparent" : jm.tonal }]}>
                  <MaterialIcons name="photo-camera" size={19} color={skinTokens.isTerminal ? TERM_PHOS : jm.deep} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.dTitle, { color: ink }]}>{item.photos.length} {item.photos.length === 1 ? "photo" : "photos"}</Text>
                  <Text style={[styles.dSub, { color: faint }]}>Taken today, gathered on their own</Text>
                </View>
                <View style={styles.thumbs}>
                  {item.photos.slice(0, 3).map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.thumb} contentFit="cover" />
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.dayNav}>
          <Text style={[styles.dayNavLabel, { color: faint }]}>One day at a time</Text>
          <Pressable
            accessibilityLabel="Previous day"
            onPress={() => onChangeDate(addDaysToIso(date, -1))}
            style={({ pressed }) => [styles.roundBtnStatic, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <MaterialIcons name="chevron-left" size={22} color={ink} />
          </Pressable>
          <Pressable
            accessibilityLabel="Next day"
            onPress={() => onChangeDate(addDaysToIso(date, 1))}
            style={({ pressed }) => [styles.roundBtnStatic, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && styles.pressed]}
          >
            <MaterialIcons name="chevron-right" size={22} color={ink} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  band: { height: BAND_H, backgroundColor: "#EAF2E5", position: "relative", overflow: "hidden" },
  ppNode: { position: "absolute", width: 74, alignItems: "center", zIndex: 2 },
  ppPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#D8D2C4",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E2814",
    shadowOpacity: 0.18,
    shadowRadius: 4.5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  // v281 (D12): the NOW border/background derive from the family
  // accent and are applied inline at the render site.
  ppRing: {
    borderRadius: 999,
    padding: 3,
    borderWidth: 3,
    margin: -6,
  },
  ppName: { fontSize: 11.5, fontWeight: "800", color: "#1D1830", marginTop: 4, lineHeight: 13, textAlign: "center" },
  ppTime: { fontSize: 10, fontWeight: "700", color: "#7C8A70", textAlign: "center" },
  ppNow: { borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1.5, marginTop: 2 },
  ppNowText: { color: "#FFFFFF", fontSize: 8.5, fontWeight: "800", letterSpacing: 1 },
  bandCaption: { position: "absolute", left: 12, bottom: 10, fontSize: 10.5, fontWeight: "700", color: "#7C8A70" },
  roundBtn: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1E2814",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  roundBtnStatic: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTitle: { fontSize: 28, fontWeight: "800", paddingHorizontal: 18, paddingTop: 14, letterSpacing: -0.3 },
  daySub: { fontSize: 13, fontWeight: "600", paddingHorizontal: 18, paddingTop: 1 },
  chipsCloud: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 18, paddingTop: 13, paddingBottom: 6 },
  dchip: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  dchipText: { fontSize: 13.5, fontWeight: "700" },
  eventTile: {
    marginHorizontal: 14,
    marginVertical: 5,
    padding: 12,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eventIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  eventTitle: { fontSize: 15, fontWeight: "800" },
  eventSub: { fontSize: 12.5, marginTop: 1 },
  autoTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  autoTagText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  // v252: the gathered-photos row is a card like the day's other
  // tiles now (the entries became cards in the same pass).
  drow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    padding: 12,
  },
  dIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dTitle: { fontSize: 15.5, fontWeight: "800" },
  dSub: { fontSize: 13, marginTop: 1 },
  thumbs: { flexDirection: "row", gap: 7 },
  thumb: { width: 62, height: 52, borderRadius: 11 },
  emptyDay: { alignItems: "center", gap: 10, paddingVertical: 44, paddingHorizontal: 32 },
  emptyDayText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  dayNav: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 18, paddingTop: 14 },
  dayNavLabel: { fontSize: 13, fontWeight: "700", marginRight: "auto" },
});
