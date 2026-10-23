import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarImage } from "@/components/avatar-system";
import { MarkdownText } from "@/components/markdown-text";
import { MoodFace, MoodFaceChip } from "@/components/mood-face";
import { moodById, type JournalMood } from "@/components/mood-picker";
import { useColors } from "@/hooks/use-colors";
import { useSkin } from "@/hooks/use-skin";
import { entryTags, formatClock, isMoodOnlyEntry, peopleMentionedInBody } from "@/lib/journal-moments";
import type { Person } from "@/lib/prayercircle-data";
import { formatPrayerJournalDate, type PrayerJournalEntry, type PrayerJournalReply } from "@/lib/prayer-journal";
import { BIT_ON_DUSK, BIT_ON_DUSK_FAINT, TERM_MID, TERM_SOFT, skinText } from "@/lib/skin-themes";

// v194 (Journal, Zeitgeist): the mockup's post — a FLAT row on a
// hairline, not a card. Avatar + name + time, the words, a photo when
// there is one, then the quiet chips (drawn mood face, #tags, people).
// Bookmark / Reply / Edit / Delete live under the ··· (the mockup's
// own PrayerCircle note), and replies stay threaded underneath.

export type JournalAuthor = { name: string; photoUri?: string; avatarAsset?: string };

type JournalPostProps = {
  entry: PrayerJournalEntry;
  author: JournalAuthor;
  people: Person[];
  onOpenPerson: (personId: string) => void;
  onOpenTag: (tag: string) => void;
  onShowActions: (entry: PrayerJournalEntry) => void;
  onReplyLongPress: (entry: PrayerJournalEntry, reply: PrayerJournalReply) => void;
  hidePhotos?: boolean;
  avatarMode?: "author" | "mood";
};

function capitalize(tag: string): string {
  return tag.length > 0 ? tag[0].toUpperCase() + tag.slice(1) : tag;
}

// Splits a body into plain segments and @mention segments for the
// people it actually mentions (full name or first name).
function mentionSegments(body: string, people: Person[]): ({ text: string } | { text: string; personId: string })[] {
  const mentioned = peopleMentionedInBody(body, people);
  if (mentioned.length === 0) return [{ text: body }];
  const names = mentioned
    .flatMap((person) => [person.name, person.name.split(/\s+/)[0]])
    .filter((name, index, all) => name && all.indexOf(name) === index)
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\w])`, "gi");
  const segments: ({ text: string } | { text: string; personId: string })[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) segments.push({ text: body.slice(lastIndex, match.index) });
    const matchedName = match[1].toLowerCase();
    const person = mentioned.find(
      (candidate) => candidate.name.toLowerCase() === matchedName || candidate.name.split(/\s+/)[0].toLowerCase() === matchedName,
    );
    segments.push(person ? { text: match[0], personId: person.id } : { text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) segments.push({ text: body.slice(lastIndex) });
  return segments;
}

export function JournalPost({
  entry,
  author,
  people,
  onOpenPerson,
  onOpenTag,
  onShowActions,
  onReplyLongPress,
  hidePhotos = false,
  avatarMode = "author",
}: JournalPostProps) {
  const colors = useColors();
  const { isSkinned, tokens: skinTokens } = useSkin();
  const [expanded, setExpanded] = useState(false);

  const paperSurface = isSkinned ? skinTokens.surface ?? colors.surface : colors.surface;
  const onColored = Boolean(entry.color);
  const ink = onColored ? "#FFFFFF" : skinTokens.isTerminal ? TERM_SOFT : skinTokens.isEightBit ? BIT_ON_DUSK : colors.foreground;
  const faint = onColored ? "rgba(255,255,255,0.75)" : skinTokens.isTerminal ? TERM_MID : skinTokens.isEightBit ? BIT_ON_DUSK_FAINT : colors.muted;
  const hairline = onColored ? "rgba(255,255,255,0.35)" : skinTokens.isTerminal ? TERM_MID : colors.border;

  const moodOnly = isMoodOnlyEntry(entry);
  const tags = useMemo(() => entryTags(entry), [entry]);
  const mentionedInBody = useMemo(() => peopleMentionedInBody(entry.body, people), [entry.body, people]);
  const taggedNotMentioned = entry.taggedPeople.filter(
    (tagged) => !mentionedInBody.some((person) => person.id === tagged.id),
  );
  const segments = useMemo(() => mentionSegments(entry.body, people), [entry.body, people]);
  const hasMentions = segments.some((segment) => "personId" in segment);
  const bodyText = expanded || entry.body.length <= 240 ? entry.body : `${entry.body.slice(0, 240)}…`;
  const photos = entry.photos ?? [];

  return (
    <Pressable
      delayLongPress={500}
      onLongPress={() => onShowActions(entry)}
      onPress={() => entry.body.length > 240 && setExpanded((current) => !current)}
      style={({ pressed }) => [
        styles.post,
        {
          backgroundColor: entry.color ?? paperSurface,
          borderBottomColor: hairline,
          ...(skinTokens.isPaper ? { padding: 16 + skinTokens.type.padBoost } : {}),
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.postHead}>
        {avatarMode === "mood" && entry.mood ? (
          <MoodFace moodId={entry.mood.id} size={30} />
        ) : (
          <AvatarImage id="journal-author" name={author.name} avatarAsset={author.avatarAsset} photoUri={author.photoUri} size={34} fallbackColor="#7C4DFF" />
        )}
        <Text style={[styles.name, { color: ink }, skinText(skinTokens, skinTokens.type.barTitle, 22)]}>{author.name}</Text>
        <Text style={[styles.time, { color: faint }]}>{formatClock(entry.createdAt)}</Text>
        <Pressable
          accessibilityLabel="Entry options"
          onPress={() => onShowActions(entry)}
          style={({ pressed }) => [styles.dots, pressed && styles.pressed]}
        >
          <MaterialIcons name="more-horiz" size={22} color={faint} />
        </Pressable>
      </View>

      {entry.title ? (
        <Text style={[styles.title, { color: ink }, skinText(skinTokens, skinTokens.type.cardTitle)]}>{entry.title}</Text>
      ) : null}

      {moodOnly && entry.mood ? (
        <View style={styles.moodLog}>
          <MoodFace moodId={entry.mood.id} size={38} />
          <View>
            <Text style={[styles.moodName, { color: ink }]}>{moodById(entry.mood.id)?.label ?? "Mood"}</Text>
            <Text style={[styles.moodSub, { color: faint }]}>Logged a mood — no words.</Text>
          </View>
        </View>
      ) : entry.body ? (
        hasMentions ? (
          <Text style={[styles.body, { color: ink }]}>
            {mentionSegments(bodyText, people).map((segment, index) =>
              "personId" in segment ? (
                <Text
                  key={index}
                  onPress={() => onOpenPerson(segment.personId)}
                  style={{ color: onColored ? "#FFFFFF" : "#5B4BD6", fontWeight: "700" }}
                >
                  {segment.text}
                </Text>
              ) : (
                <Text key={index}>{segment.text}</Text>
              ),
            )}
          </Text>
        ) : (
          <MarkdownText text={bodyText} baseColor={ink} baseSize={skinTokens.type.proseBody ?? undefined} />
        )
      ) : null}

      {!hidePhotos && photos.length > 0 ? (
        <View>
          <Image source={{ uri: photos[0] }} style={styles.photo} contentFit="cover" />
          {entry.location ? (
            <Text style={[styles.photoCaption, { color: faint }]}>{entry.location} · {formatClock(entry.createdAt)}</Text>
          ) : null}
          {photos.length > 1 ? (
            <View style={styles.thumbRow}>
              {photos.slice(1, 5).map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.thumb} contentFit="cover" />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {(entry.mood && !moodOnly) || tags.length > 0 || taggedNotMentioned.length > 0 || (entry.location && hidePhotos) ? (
        <View style={styles.chips}>
          {entry.mood && !moodOnly ? <MoodFaceChip mood={entry.mood as JournalMood} onDark={onColored} /> : null}
          {tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() => onOpenTag(tag)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: onColored ? "rgba(255,255,255,0.22)" : skinTokens.isTerminal ? "rgba(61,255,110,0.12)" : "#F4F2FA" },
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="sell" size={13} color={ink} />
              <Text style={[styles.chipText, { color: ink }]}>{capitalize(tag)}</Text>
            </Pressable>
          ))}
          {taggedNotMentioned.map((person) => (
            <Pressable
              key={person.id}
              onPress={() => onOpenPerson(person.id)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: onColored ? "rgba(255,255,255,0.22)" : skinTokens.isTerminal ? "rgba(61,255,110,0.12)" : "#F4F2FA" },
                pressed && styles.pressed,
              ]}
            >
              <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={16} fallbackColor={person.avatarColor} />
              <Text style={[styles.chipText, { color: ink }]}>{person.name.split(/\s+/)[0]}</Text>
            </Pressable>
          ))}
          {entry.location && hidePhotos ? (
            <View style={[styles.chip, { backgroundColor: onColored ? "rgba(255,255,255,0.22)" : "#F4F2FA" }]}>
              <MaterialIcons name="place" size={13} color={ink} />
              <Text style={[styles.chipText, { color: ink }]}>{entry.location}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {entry.replies.length > 0 ? (
        <View style={[styles.replies, { borderTopColor: hairline }]}>
          <Text style={[styles.replyCount, { color: faint }]}>
            {entry.replies.length} {entry.replies.length === 1 ? "reply" : "replies"}
          </Text>
          {entry.replies.map((reply) => (
            <Pressable
              key={reply.id}
              delayLongPress={500}
              onLongPress={() => onReplyLongPress(entry, reply)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <Text style={[styles.replyDate, { color: faint }]}>{formatPrayerJournalDate(reply.date)}</Text>
              <Text style={[styles.replyBody, { color: ink }, skinText(skinTokens, skinTokens.type.proseBody, skinTokens.type.proseLineHeight)]}>{reply.body}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  post: {
    paddingHorizontal: 18,
    paddingTop: 13,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pressed: { opacity: 0.7 },
  postHead: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 6 },
  name: { fontSize: 15, fontWeight: "800" },
  time: { fontSize: 13, fontWeight: "600" },
  dots: { marginLeft: "auto", padding: 4 },
  title: { fontSize: 16, fontWeight: "800", marginBottom: 4 },
  body: { fontSize: 15.5, lineHeight: 22.5 },
  moodLog: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 2 },
  moodName: { fontSize: 15.5, fontWeight: "800" },
  moodSub: { fontSize: 13 },
  photo: { height: 148, borderRadius: 16, marginTop: 10, width: "100%" },
  photoCaption: { fontSize: 11, fontWeight: "700", marginTop: 5 },
  thumbRow: { flexDirection: "row", gap: 7, marginTop: 7 },
  thumb: { width: 62, height: 52, borderRadius: 11 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12.5, fontWeight: "700" },
  replies: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 8 },
  replyCount: { fontSize: 12.5, fontWeight: "700" },
  replyDate: { fontSize: 11.5, fontWeight: "600" },
  replyBody: { fontSize: 14.5, lineHeight: 21 },
});
