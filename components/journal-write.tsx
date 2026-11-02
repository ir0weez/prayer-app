import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/avatar-system";
import { FAST_DAY_ENTRY_KIND_LABELS, type FastDayEntryKind } from "@/lib/fast-day-entries";
import { EDITOR_HEADER_CLOSE_HITSLOP, EDITOR_HEADER_PILL_HITSLOP } from "@/lib/editor-header";
import {
  DESK_POST_KINDS,
  DESK_POST_KIND_LABELS,
  deskPostTitle,
  type DeskPostInput,
  type DeskPostKind,
} from "@/lib/journal-desk";
import type { JournalMaterialFamily } from "@/lib/journal-material";
import type { PrayerJournalQuestionRef } from "@/lib/prayer-journal";
import type { Person } from "@/lib/prayercircle-data";
import { getActiveFast, getFastCalendarDays } from "@/lib/prayercircle-fasting";
import type { PersonalFast } from "@/lib/prayercircle-fasting";

// v411 — the WRITE PAGE (approved drawings: journal-whole-rework
// -v13 Frame 3 + journal-blog-concepts-v6). The same composer as
// the Desk's writing card, opened all the way: X + a kind-titled
// header ("New prayer") + Post; the kind row is this page's own
// chooser; the tools change with the kind (people for Prayer, the
// fast chips for Fast, the verse box for Verse); a "Files to"
// row says where the post lands. The words and kind ARRIVE with
// the page — carried from the writing card, never retyped — and
// posting walks the one path (lib/journal-desk composeDeskPost,
// invoked by the tab), so the landing is identical to a quick
// post's. A plain mount in place of the feed — no sheet, no
// animated window.

type JournalWriteProps = {
  jm: JournalMaterialFamily;
  initialKind: DeskPostKind;
  initialBody: string;
  people: Person[];
  /** v413: the people picker's Top 5 — the people his journal
   *  posts have carried most (rankedTaggedPeopleIds over the
   *  entries), most first. */
  topPeopleIds?: string[];
  fasts: PersonalFast[];
  todayIso: string;
  /** The pinned week's question, when the page opens over one. */
  question?: PrayerJournalQuestionRef | null;
  onUnpinQuestion?: () => void;
  onPickPhotos: () => Promise<string[]>;
  onPost: (input: DeskPostInput) => void;
  onClose: () => void;
};

export function JournalWrite({
  jm,
  initialKind,
  initialBody,
  people,
  topPeopleIds,
  fasts,
  todayIso,
  question,
  onUnpinQuestion,
  onPickPhotos,
  onPost,
  onClose,
}: JournalWriteProps) {
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<DeskPostKind>(initialKind);
  const [body, setBody] = useState(initialBody);
  const [pickedPeople, setPickedPeople] = useState<Person[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [fastKind, setFastKind] = useState<FastDayEntryKind>("note");
  const [verseBook, setVerseBook] = useState("");
  const [verseChapter, setVerseChapter] = useState("");
  const [verseNumber, setVerseNumber] = useState("");
  const [verseText, setVerseText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const activeFast = useMemo(() => getActiveFast(fasts, todayIso), [fasts, todayIso]);
  const fastDayNumber = activeFast ? getFastCalendarDays(activeFast).indexOf(todayIso) + 1 : 0;

  const verseRef = useMemo(() => {
    const chapter = parseInt(verseChapter, 10);
    const verse = parseInt(verseNumber, 10);
    if (!verseBook.trim() || !verseText.trim() || Number.isNaN(chapter) || Number.isNaN(verse)) return undefined;
    return { book: verseBook.trim(), chapter, verse, text: verseText.trim() };
  }, [verseBook, verseChapter, verseNumber, verseText]);

  const canPost =
    kind === "verse"
      ? Boolean(verseRef)
      : kind === "fast"
        ? Boolean(activeFast) && body.trim().length > 0
        : body.trim().length > 0 || photos.length > 0;

  // v413 (derive, never pin): the composer's chrome — the kind
  // selector's selected fill, the fast chips, the people chips —
  // takes the SEED like the rest of the app. The kind hues (the
  // plum Prayer, the teal Answered, the gold Praise, the fast
  // meaning colours) live only on the POSTED cards' faces
  // (components/journal-kind-post.tsx, the approved v24 formats),
  // never on the selector that writes them. Before v413 the
  // selected Prayer chip filled with the pinned violet #7C3AED
  // even under a blue seed.
  const submit = () => {
    if (!canPost) return;
    onPost({
      kind,
      body,
      date: todayIso,
      ...(pickedPeople.length > 0 ? { taggedPeople: pickedPeople } : {}),
      ...(kind === "verse" && verseRef ? { verse: verseRef } : {}),
      ...(kind === "fast" ? { fastKind, fast: activeFast } : {}),
      ...(question ? { question } : {}),
      ...(photos.length > 0 ? { photos } : {}),
    });
  };

  const togglePerson = (person: Person) => {
    setPickedPeople((current) =>
      current.some((picked) => picked.id === person.id)
        ? current.filter((picked) => picked.id !== person.id)
        : [...current, person],
    );
  };

  // v413 — the people picker, his Oct 30 rule (the v357 reader
  // picker's behaviour, carried here): at rest the picker is the
  // search field and the Top 5 — the full roster is never listed
  // in any form; typing searches the WHOLE roster and shows every
  // match, so nobody is unreachable. His current picks stay in
  // sight under both states: a picked person who is neither in
  // the Top 5 nor among the matches still renders, selected —
  // the selection is his; only the roster stays unlisted.
  const peopleQueryNorm = peopleQuery.trim().toLowerCase();
  const searchingPeople = peopleQueryNorm.length > 0;
  const peopleMatches = searchingPeople
    ? people.filter((person) => person.name.toLowerCase().includes(peopleQueryNorm))
    : [];
  const topPeople = searchingPeople
    ? []
    : (topPeopleIds ?? [])
        .map((id) => people.find((person) => person.id === id))
        .filter((person): person is Person => !!person)
        .slice(0, 5);
  const shownPeople = [...(searchingPeople ? peopleMatches : topPeople)];
  for (const picked of pickedPeople) {
    if (!shownPeople.some((person) => person.id === picked.id)) shownPeople.push(picked);
  }

  return (
    <View style={[styles.root, { backgroundColor: jm.ground, paddingTop: insets.top + 10 }]}>
      <View style={styles.head}>
        <Pressable accessibilityLabel="Close" onPress={onClose} hitSlop={EDITOR_HEADER_CLOSE_HITSLOP} style={({ pressed }) => [pressed && styles.pressed]}>
          <MaterialIcons name="close" size={22} color={jm.inkSoft} />
        </Pressable>
        <Text style={[styles.title, { color: jm.ink }]}>{deskPostTitle(kind)}</Text>
        <Pressable
          accessibilityLabel="Post"
          onPress={submit}
          disabled={!canPost}
          hitSlop={EDITOR_HEADER_PILL_HITSLOP}
          style={({ pressed }) => [
            styles.postBtn,
            { backgroundColor: jm.seed, opacity: canPost ? 1 : 0.45 },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.postBtnText}>Post</Text>
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 + insets.bottom }}>
        <View style={styles.kinds}>
          {DESK_POST_KINDS.map((candidate) => {
            const selected = candidate === kind;
            return (
              <Pressable
                key={candidate}
                onPress={() => setKind(candidate)}
                style={({ pressed }) => [
                  styles.kindChip,
                  selected
                    ? { backgroundColor: jm.seed, borderColor: jm.seed }
                    : { borderColor: jm.line },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={DESK_POST_KIND_LABELS[candidate]}
              >
                <Text style={[styles.kindChipText, { color: selected ? "#FFFFFF" : jm.inkSoft }]}>
                  {DESK_POST_KIND_LABELS[candidate]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {question ? (
          <View style={[styles.pinned, { backgroundColor: jm.tonal }]}>
            <View style={[styles.pinnedBar, { backgroundColor: jm.seed }]} />
            <Text style={[styles.pinnedText, { color: jm.inkSoft }]}>“{question.text}”</Text>
            <Pressable accessibilityLabel="Unpin question" onPress={onUnpinQuestion} hitSlop={8}>
              <MaterialIcons name="close" size={15} color={jm.inkSoft} />
            </Pressable>
          </View>
        ) : null}

        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={
            kind === "prayer"
              ? "The prayer…"
              : kind === "verse"
                ? "Your words on it (optional)…"
                : kind === "gratitude"
                  ? "What are you grateful for…"
                  : "Write it down while it's still today…"
          }
          placeholderTextColor={jm.inkSoft}
          multiline
          autoFocus
          textAlignVertical="top"
          style={[styles.area, { borderColor: jm.line, backgroundColor: jm.card, color: jm.ink }]}
        />

        {kind === "fast" ? (
          <View style={[styles.tool, { borderColor: jm.line, backgroundColor: jm.card }]}>
            {activeFast ? (
              <>
                <View style={styles.fastChips}>
                  {(Object.keys(FAST_DAY_ENTRY_KIND_LABELS) as FastDayEntryKind[]).map((candidate) => {
                    const selected = candidate === fastKind;
                    return (
                      <Pressable
                        key={candidate}
                        onPress={() => setFastKind(candidate)}
                        style={[
                          styles.fastChip,
                          selected
                            ? { backgroundColor: jm.seed, borderColor: jm.seed }
                            : { borderColor: jm.line },
                        ]}
                      >
                        <Text style={[styles.fastChipText, { color: selected ? "#FFFFFF" : jm.inkSoft }]}>
                          {FAST_DAY_ENTRY_KIND_LABELS[candidate]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[styles.toolNote, { color: jm.inkSoft }]}>
                  Day {fastDayNumber} · {activeFast.name}
                </Text>
              </>
            ) : (
              <Text style={[styles.toolNote, { color: jm.inkSoft }]}>No fast is running today.</Text>
            )}
          </View>
        ) : null}

        {kind === "prayer" || kind === "answered" ? (
          <View style={[styles.tool, { borderColor: jm.line, backgroundColor: jm.card }]}>
            <Text style={[styles.toolLabel, { color: jm.ink }]}>Who is this for?</Text>
            {people.length > 0 ? (
              <>
                <TextInput
                  value={peopleQuery}
                  onChangeText={setPeopleQuery}
                  placeholder="Search people…"
                  placeholderTextColor={jm.inkSoft}
                  autoCorrect={false}
                  style={[styles.peopleSearch, { borderColor: jm.line, backgroundColor: jm.card, color: jm.ink }]}
                />
                {!searchingPeople && topPeople.length > 0 ? (
                  <Text style={[styles.peopleTopLabel, { color: jm.inkSoft }]}>Top 5</Text>
                ) : null}
                <View style={styles.peopleChips}>
                  {shownPeople.map((person) => {
                    const selected = pickedPeople.some((picked) => picked.id === person.id);
                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => togglePerson(person)}
                        style={[
                          styles.personChip,
                          {
                            borderColor: selected ? jm.deep : jm.line,
                            backgroundColor: selected ? jm.tonal : jm.card,
                          },
                        ]}
                      >
                        <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={20} fallbackColor={person.avatarColor} />
                        <Text style={{ color: jm.ink, fontWeight: "600", fontSize: 13 }}>{person.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {searchingPeople && shownPeople.length === 0 ? (
                  <Text style={[styles.peopleEmpty, { color: jm.inkSoft }]}>No one by that name.</Text>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {kind === "verse" ? (
          <View style={[styles.tool, { borderColor: jm.line, backgroundColor: jm.card }]}>
            <Text style={[styles.toolLabel, { color: jm.ink }]}>The verse</Text>
            <View style={styles.verseRow}>
              <TextInput
                value={verseBook}
                onChangeText={setVerseBook}
                placeholder="Book"
                placeholderTextColor={jm.inkSoft}
                style={[styles.verseInput, styles.verseBook, { borderColor: jm.line, color: jm.ink }]}
              />
              <TextInput
                value={verseChapter}
                onChangeText={(value) => setVerseChapter(value.replace(/[^0-9]/g, ""))}
                placeholder="Ch."
                keyboardType="number-pad"
                placeholderTextColor={jm.inkSoft}
                style={[styles.verseInput, styles.verseSmall, { borderColor: jm.line, color: jm.ink }]}
              />
              <TextInput
                value={verseNumber}
                onChangeText={(value) => setVerseNumber(value.replace(/[^0-9]/g, ""))}
                placeholder="V."
                keyboardType="number-pad"
                placeholderTextColor={jm.inkSoft}
                style={[styles.verseInput, styles.verseSmall, { borderColor: jm.line, color: jm.ink }]}
              />
            </View>
            <TextInput
              value={verseText}
              onChangeText={setVerseText}
              placeholder="The verse's words…"
              placeholderTextColor={jm.inkSoft}
              multiline
              textAlignVertical="top"
              style={[styles.verseTextInput, { borderColor: jm.line, color: jm.ink }]}
            />
          </View>
        ) : null}

        <View style={[styles.tool, { borderColor: jm.line, backgroundColor: jm.card }]}>
          <MaterialIcons name="folder-open" size={17} color={jm.inkSoft} />
          <Text style={[styles.toolLabel, { color: jm.ink }]}>Files to</Text>
          <Text style={[styles.toolValue, { color: jm.inkSoft }]}>
            {kind === "fast" && activeFast ? `Day ${fastDayNumber} · Journal` : "Today · Journal"}
          </Text>
        </View>

        <View style={[styles.tool, { borderColor: jm.line, backgroundColor: jm.card }]}>
          <MaterialIcons name="add-a-photo" size={17} color={jm.inkSoft} />
          <Text style={[styles.toolLabel, { color: jm.ink }]}>Photos</Text>
          <Pressable
            onPress={() => {
              void onPickPhotos().then((uris) => {
                if (uris.length > 0) setPhotos((current) => [...current, ...uris].slice(0, 6));
              });
            }}
            hitSlop={6}
          >
            <Text style={[styles.toolValue, { color: jm.deep, fontWeight: "800" }]}>Add</Text>
          </Pressable>
        </View>
        {photos.length > 0 ? (
          <View style={styles.photoRow}>
            {photos.map((uri) => (
              <View key={uri}>
                <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                <Pressable
                  accessibilityLabel="Remove photo"
                  onPress={() => setPhotos((current) => current.filter((candidate) => candidate !== uri))}
                  style={styles.photoRemove}
                >
                  <MaterialIcons name="close" size={13} color="#FFFFFF" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  pressed: { opacity: 0.7 },
  head: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 12 },
  title: { fontSize: 17, fontWeight: "800", flex: 1 },
  postBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  postBtnText: { color: "#FFFFFF", fontSize: 12.5, fontWeight: "800" },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 11 },
  kindChip: { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
  kindChipText: { fontSize: 11.5, fontWeight: "700" },
  pinned: { flexDirection: "row", alignItems: "flex-start", gap: 9, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 11 },
  pinnedBar: { width: 3, alignSelf: "stretch", borderRadius: 99 },
  pinnedText: { flex: 1, fontSize: 12.5, lineHeight: 17.5, fontStyle: "italic", fontWeight: "600" },
  area: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 13.5,
    lineHeight: 19.5,
    minHeight: 96,
  },
  tool: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  toolLabel: { fontSize: 12.5, fontWeight: "700" },
  toolValue: { marginLeft: "auto", fontSize: 11.5, fontWeight: "700" },
  toolNote: { fontSize: 11.5, fontWeight: "700" },
  peopleSearch: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7, fontSize: 13.5, width: "100%", marginTop: 4 },
  peopleTopLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 1.4, textTransform: "uppercase", width: "100%", marginTop: 2 },
  peopleChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, width: "100%", marginTop: 4 },
  peopleEmpty: { fontSize: 12, width: "100%", marginTop: 2 },
  personChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  fastChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, width: "100%" },
  fastChip: { borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 11, paddingVertical: 6 },
  fastChipText: { fontSize: 11.5, fontWeight: "800" },
  verseRow: { flexDirection: "row", gap: 7, width: "100%", marginTop: 4 },
  verseInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, fontWeight: "600" },
  verseBook: { flex: 1 },
  verseSmall: { width: 58, textAlign: "center" },
  verseTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 62,
    width: "100%",
    marginTop: 7,
  },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  photo: { width: 62, height: 52, borderRadius: 11 },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
  },
});
