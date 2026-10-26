import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AvatarImage } from "@/components/avatar-system";
import { JournalEntrance } from "@/components/journal-entrance";
import { MarkdownText } from "@/components/markdown-text";
import { MoodFace, MoodFaceChip } from "@/components/mood-face";
import { moodById, type JournalMood } from "@/components/mood-picker";
import { useSkin } from "@/hooks/use-skin";
import { entryTags, formatClock, isMoodOnlyEntry, peopleMentionedInBody } from "@/lib/journal-moments";
import { useJournalMaterial } from "@/hooks/use-journal-material";
import type { Person } from "@/lib/prayercircle-data";
import { formatPrayerJournalDate, type PrayerJournalEntry, type PrayerJournalReply } from "@/lib/prayer-journal";
import { skinText } from "@/lib/skin-themes";

// v194 (Journal, Zeitgeist): the mockup's post — a FLAT row on a
// hairline, not a card. Avatar + name + time, the words, a photo when
// there is one, then the quiet chips (drawn mood face, #tags, people).
// Bookmark / Reply / Edit / Delete live under the ··· (the mockup's
// own PrayerCircle note), and replies stay threaded underneath.
//
// v252 (Journal, Material): his Oct 25 ruling — the Journal frame of
// the approved app-material-makeover mockup, "make it look like the
// mockup but usable like it is now." The flat row becomes a Material
// card (tonal surface from the Settings seed family, soft seed
// shadow, the mockup's big radius), reversing v204's flat dress the
// way v213 reversed its composer pin; everything the row DID —
// structure-aware mention/tag links, threaded replies, the ···
// actions, long-press, tap-to-expand — is untouched. The card's
// colors come from lib/journal-material (the v250 derivation family);
// the skin ladders that dressed the flat row retire with it, the way
// the Bible's did in v250. Skin TYPE (skinText spreads) stays.

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
  /** Feed position, when the post rides the v252 entrance layer (feed only). */
  entranceIndex?: number;
};

function capitalize(tag: string): string {
  return tag.length > 0 ? tag[0].toUpperCase() + tag.slice(1) : tag;
}

type BodySegment =
  | { text: string }
  | { text: string; personId: string }
  | { text: string; tag: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Splits a body into plain segments, @mention links, and #tag
// links. Mention candidates are the People list PLUS the entry's
// own structural snapshots (taggedPeople): a mention picked in the
// v204 composer is stored on the entry, so its link survives even
// if the person later leaves the People list — the text alone no
// longer carries the whole link. Matching stays Zeitgeist's rule:
// full name or first name after the @.
function bodySegments(body: string, candidates: { id: string; name: string }[]): BodySegment[] {
  if (!body) return [{ text: body }];
  const names = candidates
    .flatMap((person) => [person.name, person.name.split(/\s+/)[0]])
    .filter((name, index, all) => name && all.indexOf(name) === index)
    .sort((a, b) => b.length - a.length);
  const mentionAlt = names.length > 0 ? `@(${names.map(escapeRegExp).join("|")})(?![\\w])` : `@(?!)`;
  const pattern = new RegExp(`${mentionAlt}|#(\\w+)`, "gi");
  const segments: BodySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(body)) !== null) {
    if (match.index > lastIndex) segments.push({ text: body.slice(lastIndex, match.index) });
    if (match[1]) {
      const matchedName = match[1].toLowerCase();
      const person = candidates.find(
        (candidate) => candidate.name.toLowerCase() === matchedName || candidate.name.split(/\s+/)[0].toLowerCase() === matchedName,
      );
      segments.push(person ? { text: match[0], personId: person.id } : { text: match[0] });
    } else if (match[2]) {
      segments.push({ text: match[0], tag: match[2].toLowerCase() });
    }
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
  entranceIndex,
}: JournalPostProps) {
  const { tokens: skinTokens } = useSkin();
  const jm = useJournalMaterial();
  const [expanded, setExpanded] = useState(false);

  // v195 (Journal, Actually Zeitgeist): an entry's legacy color is
  // an ACCENT now — a thin rule at the row's left edge (colorRule
  // below) — never the row's surface. v194 filled the whole post
  // with entry.color and flipped the text white; on his phone a
  // colored long entry became a full-screen orange block, nothing
  // like the mockup's flat rows on a plain surface.
  // v196: v195 also forced the mockup's WHITE surface onto the post
  // under Classic (the lightSurface treatment) — his app runs dark
  // everywhere else and the white Journal glared ("Holy bright!").
  // His ruling: the mockup's LAYOUT, his app's SURFACE. The post is
  // back on the active skin's own surface/ink/faint/hairline tokens,
  // exactly as v194 rendered; the flat composition is unchanged.
  // v204: one step further, per his screenshot — the row paints NO
  // background at all (see the Pressable below), so feed and screen
  // are literally one surface; only ink/faint/hairline tokens ride
  // on the row now.
  // v252: the card is an opaque Material surface in every skin, so
  // its inks come from the seed family, each walked to the 4.5:1
  // floor on the ground it actually sits on (lib/journal-material).
  // v194's chip lesson holds — chips stay a bg/ink PAIR, both halves
  // derived together (tonal + tonalInk) so a name can never render
  // invisibly on its own chip again.
  const ink = jm.ink;
  const faint = jm.inkSoft;
  const hairline = jm.line;
  const chipBg = jm.tonal;
  const chipInk = jm.tonalInk;

  const moodOnly = isMoodOnlyEntry(entry);
  const tags = useMemo(() => entryTags(entry), [entry]);
  const mentionedInBody = useMemo(() => peopleMentionedInBody(entry.body, people), [entry.body, people]);
  const taggedNotMentioned = entry.taggedPeople.filter(
    (tagged) =>
      tagged.name.trim().length > 0 && !mentionedInBody.some((person) => person.id === tagged.id),
  );
  // v204: segment candidates are the People list plus this entry's
  // own tagged snapshots, so a structurally stored mention keeps
  // rendering as a link even after the person leaves the list.
  const segmentCandidates = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const person of people) byId.set(person.id, { id: person.id, name: person.name });
    for (const tagged of entry.taggedPeople) {
      if (!byId.has(tagged.id)) byId.set(tagged.id, { id: tagged.id, name: tagged.name });
    }
    return [...byId.values()];
  }, [people, entry.taggedPeople]);
  const segments = useMemo(() => bodySegments(entry.body, segmentCandidates), [entry.body, segmentCandidates]);
  const hasLinks = segments.some((segment) => "personId" in segment || "tag" in segment);
  const mentionColor = jm.deep;
  const tagColor = jm.tealDeep;
  const placeForTag = (tag: string) => (entry.places ?? []).find((place) => place.tag.toLowerCase() === tag);
  const bodyText = expanded || entry.body.length <= 240 ? entry.body : `${entry.body.slice(0, 240)}…`;
  const photos = entry.photos ?? [];

  return (
    <JournalEntrance index={entranceIndex ?? 0} style={styles.cardWrap}>
    <Pressable
      delayLongPress={500}
      onLongPress={() => onShowActions(entry)}
      onPress={() => entry.body.length > 240 && setExpanded((current) => !current)}
      style={({ pressed }) => [
        styles.post,
        {
          // v252: the post IS a card now — the approved Material
          // mockup's shape (his Oct 25 ruling reverses v204's flat
          // dress; the v204 comment above is its history). The card
          // paints the seed family's surface and casts the family's
          // soft seed shadow; the ground beneath it is the family's
          // seed-washed screen ground, so card and screen are two
          // tones of one palette, never the v195 slab-on-lavender.
          backgroundColor: jm.card,
          shadowColor: jm.shadow,
          ...(skinTokens.isPaper ? { padding: 16 + skinTokens.type.padBoost } : {}),
        },
        pressed && styles.pressed,
      ]}
    >
      {entry.color ? <View pointerEvents="none" style={[styles.colorRule, { backgroundColor: entry.color }]} /> : null}
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
        hasLinks ? (
          <Text style={[styles.body, { color: ink }]}>
            {bodySegments(bodyText, segmentCandidates).map((segment, index) =>
              "personId" in segment ? (
                <Text
                  key={index}
                  onPress={() => onOpenPerson(segment.personId)}
                  style={{ color: mentionColor, fontWeight: "700" }}
                >
                  {segment.text}
                </Text>
              ) : "tag" in segment ? (
                <Text
                  key={index}
                  onPress={() => onOpenTag(segment.tag)}
                  style={{ color: tagColor, fontWeight: "600" }}
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
          {entry.mood && !moodOnly ? <MoodFaceChip mood={entry.mood as JournalMood} /> : null}
          {tags.map((tag) => {
            // v204: a tag that is a picked place wears the place's
            // real name (and a place pin), not its squeezed token.
            const place = placeForTag(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => onOpenTag(tag)}
                style={({ pressed }) => [
                  styles.chip,
                  { backgroundColor: chipBg },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons name={place ? "place" : "sell"} size={13} color={chipInk} />
                <Text style={[styles.chipText, { color: chipInk }]}>{place ? place.name : capitalize(tag)}</Text>
              </Pressable>
            );
          })}
          {taggedNotMentioned.map((person) => (
            <Pressable
              key={person.id}
              onPress={() => onOpenPerson(person.id)}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: chipBg },
                pressed && styles.pressed,
              ]}
            >
              <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={16} fallbackColor={person.avatarColor} />
              <Text style={[styles.chipText, { color: chipInk }]} numberOfLines={1}>{person.name.split(/\s+/)[0]}</Text>
            </Pressable>
          ))}
          {entry.location && hidePhotos ? (
            <View style={[styles.chip, { backgroundColor: chipBg }]}>
              <MaterialIcons name="place" size={13} color={chipInk} />
              <Text style={[styles.chipText, { color: chipInk }]}>{entry.location}</Text>
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
    </JournalEntrance>
  );
}

const styles = StyleSheet.create({
  // v252: the entrance wrapper carries the card's outer spacing so
  // the card itself is pure surface wherever a post renders (feed,
  // person/tag sheets, the Day view).
  cardWrap: { marginHorizontal: 14, marginTop: 10 },
  post: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 13,
    borderRadius: 26,
    overflow: "hidden",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  pressed: { opacity: 0.7 },
  // v195: the legacy entry color as a thin accent rule at the row's
  // left edge — the only place a color may appear on a post now.
  // v252: the card clips it to its rounded corner (overflow above).
  colorRule: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
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
