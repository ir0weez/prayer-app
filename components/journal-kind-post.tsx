import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarImage } from "@/components/avatar-system";
import { MarkdownText } from "@/components/markdown-text";
import { MoodFaceChip } from "@/components/mood-face";
import type { JournalMood } from "@/components/mood-picker";
import { WavyProgress } from "@/components/wavy-progress";
import { hexToRgba } from "@/lib/bible-v205/palette-accents";
import { FAST_DAY_ENTRY_KIND_LABELS, type FastDayEntryKind } from "@/lib/fast-day-entries";
import type { JournalMaterialFamily } from "@/lib/journal-material";
import { deskEntryFormat } from "@/lib/journal-desk";
import { addDaysToIso, entryTags, formatClock, isoDateOf } from "@/lib/journal-moments";
import { formatPrayerJournalDate, type PrayerJournalEntry } from "@/lib/prayer-journal";
import type { PersonalFast } from "@/lib/prayercircle-fasting";

// v411 — the Desk's per-kind feed formats (approved drawing:
// journal-kind-formats-v24.html — v20's FORMAT-level differences
// in Material dress, Gratitude left-aligned, no arch markers, the
// Verse as a Bible card). Each kind's unit itself changes:
//   Entry     — the one true white Material card, CIRCLE marker
//   Prayer    — plum tonal split card, faces lead
//   Answered  — filled teal banner, seal medallion
//   Praise    — gold tonal spotlight, centered
//   Gratitude — rose tonal keepsake, LEFT-aligned
//   Verse     — a Bible card: flat primary-container tonal, a
//               chunky filled numeral badge, OPEN IN BIBLE pill
//   Answer    — a linked pair: the week's question card + the
//               answer card offset under it
//   Fast      — never a single post: the day's entries group into
//               ONE log (FastLogCard below)
// Surfaces derive from the Journal family (seed × appearance);
// the kind hues are the family's meaning hues. No gradients, no
// arch shapes, icons only. Every card keeps the standing
// affordances: long-press (or its ··· where drawn) opens the
// entry's actions, the footer carries replies + the bookmark.

export type KindPostCallbacks = {
  onShowActions: (entry: PrayerJournalEntry) => void;
  onToggleBookmark: (entry: PrayerJournalEntry) => void;
  onOpenPerson: (personId: string) => void;
  onReplyLongPress: (entry: PrayerJournalEntry, reply: PrayerJournalEntry["replies"][number]) => void;
  onOpenVerse?: (entry: PrayerJournalEntry) => void;
};

type KindPostProps = KindPostCallbacks & {
  entry: PrayerJournalEntry;
  jm: JournalMaterialFamily;
  /** Rendered without the feed's outer margins (the Memories seat). */
  bare?: boolean;
};

/** 12-hour clock for a real timestamp ("3:24 PM"). Migrated fast
 *  entries never call this — their time was never recorded. */
export function timeLabel12(isoDateTime: string): string {
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayLabel(entry: PrayerJournalEntry): string {
  const todayKey = isoDateOf(new Date());
  if (entry.date === todayKey) return "Today";
  if (entry.date === addDaysToIso(todayKey, -1)) return "Yesterday";
  return formatPrayerJournalDate(entry.date, false);
}

function KindFooter({
  entry,
  jm,
  ink,
  faint,
  onToggleBookmark,
}: {
  entry: PrayerJournalEntry;
  jm: JournalMaterialFamily;
  ink: string;
  faint: string;
  onToggleBookmark: (entry: PrayerJournalEntry) => void;
}) {
  return (
    <View style={[styles.footer, { borderTopColor: hexToRgba(ink, 0.14) }]}>
      {entry.replies.length > 0 ? (
        <View style={styles.footerLeft}>
          <MaterialIcons name="chat-bubble-outline" size={13} color={faint} />
          <Text style={[styles.footerText, { color: faint }]}>
            {entry.replies.length} {entry.replies.length === 1 ? "reply" : "replies"}
          </Text>
        </View>
      ) : (
        <View />
      )}
      <Pressable
        accessibilityLabel={entry.isBookmarked ? "Remove bookmark" : "Bookmark entry"}
        onPress={() => onToggleBookmark(entry)}
        style={({ pressed }) => [styles.footerBookmark, pressed && styles.pressed]}
      >
        <MaterialIcons name={entry.isBookmarked ? "bookmark" : "bookmark-border"} size={18} color={entry.isBookmarked ? jm.deep : faint} />
      </Pressable>
    </View>
  );
}

function KindReplies({
  entry,
  ink,
  faint,
  onReplyLongPress,
}: {
  entry: PrayerJournalEntry;
  ink: string;
  faint: string;
  onReplyLongPress: KindPostProps["onReplyLongPress"];
}) {
  if (entry.replies.length === 0) return null;
  return (
    <View style={[styles.replies, { borderTopColor: hexToRgba(ink, 0.14) }]}>
      {entry.replies.map((reply) => (
        <Pressable
          key={reply.id}
          delayLongPress={500}
          onLongPress={() => onReplyLongPress(entry, reply)}
          style={({ pressed }) => [pressed && styles.pressed]}
        >
          <Text style={[styles.replyDate, { color: faint }]}>{formatPrayerJournalDate(reply.date)}</Text>
          <Text style={[styles.replyBody, { color: ink }]}>{reply.body}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function JournalKindPost({ entry, jm, bare, ...callbacks }: KindPostProps) {
  const format = deskEntryFormat(entry);
  const wrap = (node: React.ReactNode, style?: object) => (
    <Pressable
      delayLongPress={500}
      onLongPress={() => callbacks.onShowActions(entry)}
      style={({ pressed }) => [styles.cardWrap, bare && styles.cardWrapBare, style, pressed && styles.pressed]}
    >
      {node}
    </Pressable>
  );

  if (format === "prayer") {
    const people = entry.taggedPeople;
    const names = people.map((person) => person.name.split(/\s+/)[0]);
    return wrap(
      <View style={[styles.prayer, { backgroundColor: jm.prayerTint }]}>
        {people.length > 0 ? (
          <View style={styles.prayerFaces}>
            {/* v429 (his correction, Nov 4): the overlap is back —
                he liked the stacked look; what he wanted fixed was
                the circles. The pre-v426 stack painted DESCENDING
                (zIndex 3 - index): each later face slid UNDER the
                one above, so the front face's disc sliced it — its
                top read as a concave cut, its disc pinched to a
                pointed tail where it emerged at the front face's
                lower-right, and two same-coloured faces merged
                into one speech-bubble blob. The 3px tint ring
                never saved it: the only ring visible between the
                fills belonged to the face in front, outlining the
                cutter, never the cut face. Now each later face
                paints OVER the previous one (ascending zIndex), so
                every face's own tint ring is drawn against the
                face behind it and its disc reads as a complete
                circle; earlier faces peek out from behind. */}
            {people.slice(0, 3).map((person, index) => (
              <Pressable
                key={person.id}
                onPress={() => callbacks.onOpenPerson(person.id)}
                style={[styles.prayerFace, { borderColor: jm.prayerTint, marginTop: index === 0 ? 0 : -12, marginLeft: index === 0 ? 0 : 15, zIndex: index + 1 }]}
              >
                <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={40} fallbackColor={person.avatarColor} />
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.klab, { color: jm.prayerDeep }]}>PRAYER</Text>
          <Text style={[styles.prayerWho, { color: jm.prayerInk }]}>
            {entry.title ?? (names.length > 0 ? `For ${names.join(" & ")}` : "Prayer")}
          </Text>
          {entry.body ? <Text style={[styles.body, { color: jm.prayerInk }]}>{entry.body}</Text> : null}
          <View style={styles.prayerFoot}>
            <View style={[styles.kpill, { backgroundColor: jm.prayerDeep }]}>
              <Text style={styles.kpillText}>ON THEIR PAGES TOO</Text>
            </View>
            <Text style={[styles.tm, { color: jm.prayerInk, marginLeft: "auto" }]}>{timeLabel12(entry.createdAt)}</Text>
          </View>
          <KindFooter entry={entry} jm={jm} ink={jm.prayerInk} faint={jm.prayerInk} onToggleBookmark={callbacks.onToggleBookmark} />
          <KindReplies entry={entry} ink={jm.prayerInk} faint={jm.prayerInk} onReplyLongPress={callbacks.onReplyLongPress} />
        </View>
      </View>,
    );
  }

  if (format === "answered") {
    const person = entry.taggedPeople[0];
    const when = formatPrayerJournalDate(entry.date, false);
    return wrap(
      <View style={[styles.answered, { backgroundColor: jm.tealFill }]}>
        <View style={[styles.seal, { backgroundColor: jm.card }]}>
          <MaterialIcons name="check" size={22} color={jm.tealFill} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.answeredWhat, { color: jm.tealFillInk }]}>
            {entry.title ? `Answered — ${entry.title}` : "Answered"}
          </Text>
          <Text style={[styles.answeredSub, { color: jm.tealFillInk }]}>
            {when}
            {entry.body ? ` · ${entry.body}` : ""}
            {person ? ` · ${person.name.split(/\s+/)[0]}` : ""}
          </Text>
          <KindFooter entry={entry} jm={jm} ink={jm.tealFillInk} faint={jm.tealFillInk} onToggleBookmark={callbacks.onToggleBookmark} />
          <KindReplies entry={entry} ink={jm.tealFillInk} faint={jm.tealFillInk} onReplyLongPress={callbacks.onReplyLongPress} />
        </View>
      </View>,
    );
  }

  if (format === "praise") {
    const person = entry.taggedPeople[0];
    return wrap(
      <View style={[styles.praise, { backgroundColor: jm.goldTint }]}>
        {person ? (
          <Pressable onPress={() => callbacks.onOpenPerson(person.id)} style={[styles.praiseRing, { borderColor: jm.gold }]}>
            <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={60} fallbackColor={person.avatarColor} />
          </Pressable>
        ) : null}
        <Text style={[styles.klab, { color: jm.goldDeep, marginTop: person ? 11 : 0 }]}>PRAISE</Text>
        {person ? (
          <Text style={[styles.praiseWho, { color: jm.ink }]}>For {person.name.split(/\s+/)[0]}</Text>
        ) : null}
        {entry.body ? <Text style={[styles.body, { color: jm.ink, textAlign: "center" }]}>{entry.body}</Text> : null}
        <View style={[styles.kpill, { backgroundColor: jm.gold, marginTop: 11, alignSelf: "center" }]}>
          <Text style={styles.kpillText}>{formatPrayerJournalDate(entry.date, false).toUpperCase()}</Text>
        </View>
        <KindFooter entry={entry} jm={jm} ink={jm.ink} faint={jm.inkSoft} onToggleBookmark={callbacks.onToggleBookmark} />
        <KindReplies entry={entry} ink={jm.ink} faint={jm.inkSoft} onReplyLongPress={callbacks.onReplyLongPress} />
      </View>,
    );
  }

  if (format === "gratitude") {
    return wrap(
      <View style={[styles.grat, { backgroundColor: jm.gratitudeTint }]}>
        <View style={styles.gratHead}>
          <View style={[styles.gratMed, { backgroundColor: jm.gratitudeDeep }]}>
            <MaterialIcons name="favorite" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.klab, { color: jm.gratitudeDeep }]}>GRATITUDE</Text>
            <Text style={[styles.gratWho, { color: jm.gratitudeInk }]}>{entry.title ?? dayLabel(entry)}</Text>
          </View>
          <Text style={[styles.tm, { color: jm.gratitudeInk }]}>{timeLabel12(entry.createdAt)}</Text>
        </View>
        {entry.body ? <Text style={[styles.gratBody, { color: jm.gratitudeInk }]}>{entry.body}</Text> : null}
        <KindFooter entry={entry} jm={jm} ink={jm.gratitudeInk} faint={jm.gratitudeInk} onToggleBookmark={callbacks.onToggleBookmark} />
        <KindReplies entry={entry} ink={jm.gratitudeInk} faint={jm.gratitudeInk} onReplyLongPress={callbacks.onReplyLongPress} />
      </View>,
    );
  }

  if (format === "verse" && entry.verse) {
    const verse = entry.verse;
    return wrap(
      <View style={[styles.verse, { backgroundColor: jm.verseContainer }]}>
        <View style={styles.verseHead}>
          <View style={[styles.verseNum, { backgroundColor: jm.seed }]}>
            <Text style={styles.verseNumText}>{verse.verse}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.klab, { color: jm.deep }]}>VERSE</Text>
            <Text style={[styles.verseRef, { color: jm.verseInk }]}>
              {verse.book} {verse.chapter}:{verse.verse}
            </Text>
            <Text style={[styles.verseSub, { color: jm.verseInkSoft }]}>
              {dayLabel(entry)} · {timeLabel12(entry.createdAt)}
            </Text>
          </View>
        </View>
        <Text style={[styles.verseText, { color: jm.verseInk }]}>“{verse.text}”</Text>
        {entry.body && entry.body !== verse.text ? (
          <Text style={[styles.body, { color: jm.verseInk }]}>{entry.body}</Text>
        ) : null}
        <View style={[styles.verseFoot, { borderTopColor: hexToRgba(jm.verseInk, 0.14) }]}>
          <Pressable
            onPress={() => callbacks.onOpenVerse?.(entry)}
            style={({ pressed }) => [styles.openPill, { backgroundColor: jm.seed }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${verse.book} ${verse.chapter} in the Bible`}
          >
            <MaterialIcons name="menu-book" size={12} color="#FFFFFF" />
            <Text style={styles.openPillText}>OPEN IN BIBLE</Text>
          </Pressable>
          <Text style={[styles.tm, { color: jm.verseInkSoft, marginLeft: "auto" }]}>{timeLabel12(entry.createdAt).toUpperCase()}</Text>
        </View>
        <KindFooter entry={entry} jm={jm} ink={jm.verseInk} faint={jm.verseInkSoft} onToggleBookmark={callbacks.onToggleBookmark} />
        <KindReplies entry={entry} ink={jm.verseInk} faint={jm.verseInkSoft} onReplyLongPress={callbacks.onReplyLongPress} />
      </View>,
    );
  }

  if (format === "answer" && entry.question) {
    return wrap(
      <View>
        <View style={[styles.qaQuestion, { backgroundColor: jm.questionTint }]}>
          <Text style={[styles.klab, { color: jm.deep }]}>THE WEEK'S QUESTION</Text>
          <Text style={[styles.qaQuestionText, { color: jm.questionInk }]}>{entry.question.text}</Text>
        </View>
        <View style={[styles.qaLink, { backgroundColor: jm.seed }]} />
        <View style={[styles.qaAnswer, { backgroundColor: jm.card, shadowColor: jm.shadow }]}>
          <Text style={[styles.klab, { color: jm.deep }]}>YOUR ANSWER · {timeLabel12(entry.createdAt).toUpperCase()}</Text>
          {entry.body ? <Text style={[styles.body, { color: jm.ink }]}>{entry.body}</Text> : null}
          <KindFooter entry={entry} jm={jm} ink={jm.ink} faint={jm.inkSoft} onToggleBookmark={callbacks.onToggleBookmark} />
          <KindReplies entry={entry} ink={jm.ink} faint={jm.inkSoft} onReplyLongPress={callbacks.onReplyLongPress} />
        </View>
      </View>,
    );
  }

  // Entry — the one true card (also the fallback for any kind the
  // formats don't carry, and for a verse/answer whose payload a
  // legacy pack didn't keep).
  const tags = entryTags(entry);
  const photos = entry.photos ?? [];
  return wrap(
    <View style={[styles.entryCard, { backgroundColor: jm.card, shadowColor: jm.shadow }]}>
      <View style={styles.entryHead}>
        <View style={[styles.entryMarker, { backgroundColor: jm.seed }]}>
          <MaterialIcons name="edit" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          {entry.title ? <Text style={[styles.entryHeadline, { color: jm.ink }]}>{entry.title}</Text> : null}
          <Text style={[styles.entrySub, { color: jm.inkSoft }]}>
            {dayLabel(entry)} · {formatClock(entry.createdAt)}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Entry options"
          onPress={() => callbacks.onShowActions(entry)}
          style={({ pressed }) => [styles.dots, pressed && styles.pressed]}
        >
          <MaterialIcons name="more-horiz" size={21} color={jm.inkSoft} />
        </Pressable>
      </View>
      {entry.body ? <MarkdownText text={entry.body} baseColor={jm.ink} /> : null}
      {photos.length > 0 ? (
        <View>
          <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" />
          {photos.length > 1 ? (
            <View style={styles.thumbRow}>
              {photos.slice(1, 5).map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} contentFit="cover" />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
      {entry.mood || tags.length > 0 ? (
        <View style={styles.chips}>
          {entry.mood ? <MoodFaceChip mood={entry.mood as JournalMood} /> : null}
          {tags.map((tag) => (
            <View key={tag} style={[styles.chip, { backgroundColor: jm.tonal }]}>
              <Text style={[styles.chipText, { color: jm.tonalInk }]}>#{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <KindFooter entry={entry} jm={jm} ink={jm.ink} faint={jm.inkSoft} onToggleBookmark={callbacks.onToggleBookmark} />
      <KindReplies entry={entry} ink={jm.ink} faint={jm.inkSoft} onReplyLongPress={callbacks.onReplyLongPress} />
    </View>,
  );
}

// ─── The fast log ────────────────────────────────────────────────────────────

const FAST_STATE_ICONS: Record<FastDayEntryKind, keyof typeof MaterialIcons.glyphMap> = {
  held: "check",
  "close-call": "priority-high",
  fell: "close",
  note: "edit",
};

export function FastLogCard({
  fast,
  date,
  dayNumber,
  entries,
  jm,
  bare,
  onOpenDay,
  onShowActions,
}: {
  fast: PersonalFast;
  date: string;
  dayNumber: number;
  /** The day's fast entries, in the day's own (chronological) order. */
  entries: PrayerJournalEntry[];
  jm: JournalMaterialFamily;
  /** Rendered without the feed's outer margins (the Memories seat). */
  bare?: boolean;
  onOpenDay: (fast: PersonalFast, date: string) => void;
  onShowActions: (entry: PrayerJournalEntry) => void;
}) {
  const status = fast.dayStatuses[date];
  const statusPill =
    status === "completed"
      ? { label: "ON TRACK", fill: jm.heldDot }
      : status === "skipped"
        ? { label: "STRUGGLED", fill: jm.closeCallDot }
        : status === "missed"
          ? { label: "BROKE", fill: jm.fellDot }
          : null;
  const dotFor = (kind: FastDayEntryKind): string =>
    kind === "held" ? jm.heldDot : kind === "close-call" ? jm.closeCallDot : kind === "fell" ? jm.fellDot : jm.noteDot;
  const rows = [...entries].reverse(); // the feed reads newest first
  const todayKey = isoDateOf(new Date());
  return (
    <Pressable
      onPress={() => onOpenDay(fast, date)}
      style={({ pressed }) => [styles.cardWrap, bare && styles.cardWrapBare, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Fast day ${dayNumber}`}
    >
      <View style={[styles.fastLog, { backgroundColor: jm.fastTint }]}>
        <View style={styles.fastHead}>
          <Text style={[styles.klab, { color: jm.fastDeep }]}>
            {date === todayKey ? "TODAY'S FAST" : "THE FAST"} · DAY {dayNumber}
          </Text>
          {statusPill ? (
            <View style={[styles.kpill, { backgroundColor: statusPill.fill, marginLeft: "auto" }]}>
              <Text style={styles.kpillText}>{statusPill.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.fastRows}>
          <View style={[styles.fastRail, { backgroundColor: hexToRgba(jm.fastDeep, 0.3) }]} />
          {rows.map((entry) => {
            const kind = entry.fastDay?.kind ?? "note";
            return (
              <Pressable
                key={entry.id}
                delayLongPress={500}
                onLongPress={() => onShowActions(entry)}
                style={({ pressed }) => [styles.fastRow, pressed && styles.pressed]}
              >
                <View style={[styles.fastDot, { backgroundColor: dotFor(kind), borderColor: jm.fastTint }]}>
                  <MaterialIcons name={FAST_STATE_ICONS[kind]} size={9} color="#FFFFFF" />
                </View>
                <Text style={[styles.fastRowText, { color: jm.fastInk }]}>
                  <Text style={{ fontWeight: "800" }}>{FAST_DAY_ENTRY_KIND_LABELS[kind]}</Text>
                  {entry.body ? <Text> — {entry.body}</Text> : null}
                  {entry.fastDay?.migrated ? null : (
                    <Text style={{ color: jm.fastDeep, fontWeight: "800", fontSize: 10 }}>  {timeLabel12(entry.createdAt).toUpperCase()}</Text>
                  )}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={[styles.fastFoot, { borderTopColor: hexToRgba(jm.fastDeep, 0.22) }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <WavyProgress
              value={fast.durationDays > 0 ? dayNumber / fast.durationDays : 0}
              color={jm.fastDeep}
              trackColor={hexToRgba(jm.fastDeep, 0.25)}
              height={8}
            />
          </View>
          <Text style={[styles.tm, { color: jm.fastDeep }]}>
            {dayNumber} OF {fast.durationDays}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrap: { marginHorizontal: 14, marginTop: 10 },
  cardWrapBare: { marginHorizontal: 0, marginTop: 0 },
  pressed: { opacity: 0.7 },
  klab: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.6 },
  tm: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },
  body: { fontSize: 13.5, lineHeight: 19.5, marginTop: 4 },
  kpill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  kpillText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.2, color: "#FFFFFF" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 11,
    paddingTop: 8,
  },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  footerText: { fontSize: 12.5, fontWeight: "700" },
  footerBookmark: { padding: 4 },
  replies: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 10, paddingTop: 9, gap: 8, alignSelf: "stretch" },
  replyDate: { fontSize: 11.5, fontWeight: "600" },
  replyBody: { fontSize: 14, lineHeight: 20 },
  dots: { padding: 4 },

  // Entry
  entryCard: {
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 12,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  entryHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  entryMarker: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  entryHeadline: { fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  entrySub: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  photo: { height: 138, borderRadius: 20, marginTop: 10, width: "100%" },
  thumbRow: { flexDirection: "row", gap: 7, marginTop: 7 },
  thumb: { width: 62, height: 52, borderRadius: 11 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  chip: { flexDirection: "row", alignItems: "center", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 12.5, fontWeight: "700" },

  // Prayer
  prayer: { borderRadius: 28, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 12, flexDirection: "row", gap: 13 },
  // v426 (his report, Nov 4): each face is one complete, separate
  // circle — the old stack overlapped faces (marginTop -12, shifted
  // 15 right), so two same-coloured faces sliced into one blob with a
  // pointed tail. Faces now sit in a plain column with a small gap.
  // v429 amendment (his correction, later Nov 4): the separation
  // threw away a look he likes — "I just wanted them to be fixed
  // into circles." The overlap composition is restored at the render
  // site; the circles are fixed by the stacking order (each later
  // face paints over the previous, its own ring against the face
  // behind), not by separation. See the v429 note in the prayer
  // branch above.
  prayerFaces: { flexDirection: "column" },
  prayerFace: { borderRadius: 999, borderWidth: 3, overflow: "hidden" },
  prayerWho: { fontSize: 15.5, fontWeight: "800", lineHeight: 19, marginTop: 1 },
  prayerFoot: { flexDirection: "row", alignItems: "center", marginTop: 9 },

  // Answered
  answered: { borderRadius: 20, paddingHorizontal: 15, paddingVertical: 13, flexDirection: "row", gap: 13, alignItems: "flex-start" },
  seal: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  answeredWhat: { fontSize: 15.5, fontWeight: "800", lineHeight: 20 },
  answeredSub: { fontSize: 11.5, fontWeight: "600", lineHeight: 16, marginTop: 2, opacity: 0.92 },

  // Praise
  praise: { borderRadius: 32, paddingHorizontal: 16, paddingTop: 17, paddingBottom: 14, alignItems: "center" },
  praiseRing: { borderRadius: 999, borderWidth: 4, overflow: "hidden" },
  praiseWho: { fontSize: 18, fontWeight: "800", marginTop: 2 },

  // Gratitude
  grat: { borderRadius: 32, paddingHorizontal: 17, paddingTop: 15, paddingBottom: 14 },
  gratHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  gratMed: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  gratWho: { fontSize: 15, fontWeight: "800", marginTop: 1 },
  gratBody: { fontSize: 14.5, lineHeight: 21, fontStyle: "italic", marginTop: 10 },

  // Verse
  verse: { borderRadius: 28, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 12 },
  verseHead: { flexDirection: "row", alignItems: "center", gap: 11 },
  verseNum: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B4FA8",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  verseNumText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  verseRef: { fontSize: 15.5, fontWeight: "800", marginTop: 1 },
  verseSub: { fontSize: 11, fontWeight: "700", marginTop: 1 },
  verseText: { fontSize: 15, lineHeight: 22, fontWeight: "600", marginTop: 10 },
  verseFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  openPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openPillText: { fontSize: 10, fontWeight: "800", letterSpacing: 1, color: "#FFFFFF" },

  // Answer
  qaQuestion: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 12 },
  qaQuestionText: { fontSize: 13.5, lineHeight: 19, fontWeight: "700", marginTop: 3 },
  qaLink: { width: 3, height: 12, marginLeft: 22, opacity: 0.5 },
  qaAnswer: {
    borderRadius: 20,
    marginLeft: 22,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  // Fast log
  fastLog: { borderRadius: 28, paddingHorizontal: 15, paddingTop: 14, paddingBottom: 12 },
  fastHead: { flexDirection: "row", alignItems: "center" },
  fastRows: { position: "relative", marginTop: 10, marginLeft: 8, paddingLeft: 20 },
  fastRail: { position: "absolute", left: 0, top: 9, bottom: 9, width: 2.5, borderRadius: 2 },
  fastRow: { position: "relative", paddingVertical: 5 },
  fastDot: {
    position: "absolute",
    left: -28.5,
    top: 5,
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  fastRowText: { fontSize: 13, lineHeight: 18 },
  fastFoot: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
