import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/avatar-system";
import { DateTimePicker } from "@/components/date-time-picker";
import { JournalDay } from "@/components/journal-day";
import { FastLogCard, JournalKindPost, timeLabel12 } from "@/components/journal-kind-post";
import { JournalPost, type JournalAuthor } from "@/components/journal-post";
import { CalendarSheet, PersonSheet, TagSheet } from "@/components/journal-sheets";
import { JournalWrite } from "@/components/journal-write";
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from "@/components/top-fade";
import { PaperSettle } from "@/components/paper-motion";
import { BitSettle } from "@/components/bit-motion";
import { MoodPicker, type JournalMood } from "@/components/mood-picker";
import { useColors } from "@/hooks/use-colors";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useSkin } from "@/hooks/use-skin";
import { getFastDayEntries, migrateFastDayEntriesInStorage } from "@/lib/fast-day-entries";
import {
  activeTokenAt,
  addDaysToIso,
  applySuggestion,
  formatClock,
  isoDateOf,
  knownPlaces,
  momentsFeedItems,
  peopleSuggestions,
  placeSuggestions,
  placeTagFor,
  type MomentsFeedItem,
} from "@/lib/journal-moments";
import {
  DESK_POST_KIND_LABELS,
  activeFastChip,
  composeDeskPost,
  deskDateLabel,
  deskEntryFormat,
  deskFeedItems,
  postsTodayCount,
  rankedTaggedPeopleIds,
  weekQuestionAnswered,
  weekQuestionFor,
  type DeskFeedItem,
  type DeskPostInput,
  type DeskPostKind,
} from "@/lib/journal-desk";
import { useJournalMaterial } from "@/hooks/use-journal-material";
import type { Person } from "@/lib/prayercircle-data";
import {
  addPrayerJournalReply,
  createPrayerJournalEntry,
  formatPrayerJournalDate,
  removePrayerJournalEntry,
  removePrayerJournalReply,
  togglePrayerJournalBookmark,
  updatePrayerJournalEntry,
  updatePrayerJournalReply,
  type PrayerJournalEntry,
  type PrayerJournalQuestionRef,
  type PrayerJournalReply,
  type PrayerJournalTaggedPlace,
} from "@/lib/prayer-journal";
import type { PersonalFast } from "@/lib/prayercircle-fasting";
import { PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
import { SCHEDULE_EVENTS_KEY, type ScheduleEvent } from "@/lib/schedule-data";
import {
  BIT_ON_DUSK,
  BIT_PANEL,
  BIT_PURPLE,
  TERM_MID,
  TERM_PANEL,
  TERM_PHOS,
  TERM_SOFT,
  bitButtonInk,
  bitButtonStyle,
  skinText,
  termButtonInk,
  termButtonStyle,
} from "@/lib/skin-themes";

const JOURNAL_COLORS = ["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1"];

type PrayerJournalTabProps = {
  /** v254: the attention bell, rendered at the masthead's right edge (Piece D). */
  headerBell?: React.ReactNode;
  entries: PrayerJournalEntry[];
  people: Person[];
  onChange: (entries: PrayerJournalEntry[]) => void;
  // v204: the shell hides its tab bar while the Journal composer is
  // open — the morphing box takes the bar's place — so the tab
  // reports its compose state up.
  onComposeChange?: (composing: boolean) => void;
};

// v196: the feed item type + the filter/grouping itself live in
// lib/journal-moments (momentsFeedItems) so the post → feed round
// trip is covered by tests, not just by this component.
// v411: the Desk's item model lives beside it in lib/journal-desk
// (deskFeedItems); the list renders Desk items at rest and the
// filtered Moments items while a search/bookmark filter is on.
type FeedItem = MomentsFeedItem;
type DeskListItem = FeedItem | DeskFeedItem;

function parseDateKey(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// v194 (Journal, Zeitgeist): the Journal rebuilt to the approved
// mockup — Moments, a flat hairline feed of posts (text, photos, and
// mood-only logs), the day pill opening an auto-assembled Day
// overview, @mention person profiles, tag pages, and a painted mood
// calendar. The PrayerCircle app icon stands where the mockup's ghost
// stood (his one amendment). Existing entries keep everything they
// had: text, hashtags (now tag chips), timestamps, bookmarks and
// replies (under each post's ···), colors, locations and tagged
// people.
// v195 (Journal, Actually Zeitgeist): composition repair — his
// phone showed v194's feed as color-filled blocks, a day pill
// floating over entries, and the composer buried under the tab
// bar. Now: entry colors are a thin accent rule only, the day pill
// sits IN the feed flow, the composer is an in-flow bar pinned
// above the tab bar, and under Classic the whole Moments screen
// wears the mockup's own light surface.
// v196: three verdicts on v195. (1) "Holy bright!" — the forced
// white surface is REVERSED: the mockup's layout stays, but the
// Journal renders on the active skin's own surface again (dark
// under his Classic), as v194 did. (2) "I can't see what I'm
// typing…" — the composer sat under the keyboard (the old
// KeyboardAvoidingView was iOS-only); the screen now pads by the
// real keyboard height (useKeyboardHeight) so the composer rides
// above it on both platforms. (3) A posted thought "didn't save" —
// it had: the Moments-only search/bookmark filter (lib
// momentsFeedItems) silently kept a leftover query applied after
// the search bar closed, so the fresh post was filtered out of
// Moments while Day, which reads raw entries, showed it. Posting
// now clears every filter and scrolls the feed to the new post.
// v204: three more of his verdicts. (1) The feed STILL read as
// cards on his phone — each row painted the surface token over the
// screen's background token, pale slabs on lavender; rows now
// paint nothing at all, so Moments is one surface with hairlines,
// the day pill flattened to match. (2) The composer is the morph
// he asked for: a "+" FAB at rest (no bar, no grey strip), one
// fluid timing animation into a CLEAR frosted box standing in the
// tab bar's place (the shell hides the bar), riding the keyboard,
// folding back on tap-out / post / close. (3) "@" finally works —
// it never had an insertion path (see lib/journal-moments): the
// composer (and the long editor) autocomplete people and places
// from the token at the cursor, and picks are stored structurally
// on the entry (taggedPeople / places), so the links are data,
// not render-time guesses.
// v411 (Journal/Fast Rework, Part 2 — THE DESK; his Nov 1 build
// word, drawings v13/v24/v6/v11/v12): the Journal home is rebuilt
// as the Desk. The masthead carries the date and the fast's day
// chip; the writing card is the hero composer (the v204 morph
// retires — the card is in the flow, plain-mounted, kind chosen
// by a flat text link, Prayer/Verse/More as doors to the Write
// Page); the week's question sits directly under it and pins
// into the draft on tap; the feed renders each kind in its v24
// format, fast days grouped into one log; Carried This Week and
// Memories hold their seats; yesterday shows its real posts and
// older days rest as one-line headers into the Day view. Search,
// bookmarks, the calendar, the person/tag pages, the Day view,
// the long-form EDITOR (edits), replies, bookmarks and both
// write-in paths all survive — the filtered feed keeps the v281
// post dress, and only the unfiltered home wears the Desk.
export function PrayerJournalTab({ entries, people, onChange, onComposeChange, headerBell }: PrayerJournalTabProps) {
  const fadeScrollY = useTopFadeScrollY();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { isSkinned, tokens: skinTokens } = useSkin();
  // v252: the Journal's Material family (seed-derived, lib/journal-material).
  const jm = useJournalMaterial();
  // The 8-bit pixel face for small caps labels (was a local helper in
  // the old Journal too; the skin pins look for it here).
  const bitText = (size: number) =>
    skinTokens.isEightBit && skinTokens.displayFont
      ? { fontFamily: skinTokens.displayFont, fontSize: size, lineHeight: Math.round(size * 1.6), textTransform: "uppercase" as const }
      : {};

  const todayIso = isoDateOf(new Date());
  const yesterdayIso = addDaysToIso(todayIso, -1);

  // Side data the Day overview needs, read from the app's own stores:
  // the schedule (auto tiles + day counts + the Places Path) and the
  // fasts (the day's fast state). Read-only — the Journal never
  // writes either.
  const [scheduleEvents, setScheduleEvents] = useState<ScheduleEvent[]>([]);
  const [fasts, setFasts] = useState<PersonalFast[]>([]);
  const [author, setAuthor] = useState<JournalAuthor>({ name: "You" });
  const refreshSideData = useCallback(async () => {
    try {
      // v411: the fasts arrive through Part 1's migration runner —
      // the Desk's question, chip, logs and memories all read the
      // migrated record (dailyNotes already journal entries), and
      // when the migration moved something the shell hears it
      // through onChange like any other journal write.
      const [eventsRaw, profileRaw, migration] = await Promise.all([
        AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
        migrateFastDayEntriesInStorage().catch(() => null),
      ]);
      if (eventsRaw) {
        const parsed: unknown = JSON.parse(eventsRaw);
        if (Array.isArray(parsed)) setScheduleEvents(parsed as ScheduleEvent[]);
      }
      if (migration) {
        setFasts(migration.fasts);
        if (migration.changed) onChange(migration.entries);
      }
      if (profileRaw) {
        const profile = JSON.parse(profileRaw) as { name?: string; photoUri?: string; avatarAsset?: string };
        setAuthor({
          name: profile.name?.trim() ? profile.name : "You",
          photoUri: profile.photoUri,
          avatarAsset: profile.avatarAsset,
        });
      }
    } catch {
      // Quiet: the feed works without the side data.
    }
  }, [onChange]);
  useEffect(() => {
    void refreshSideData();
  }, [refreshSideData]);
  useFocusEffect(
    useCallback(() => {
      void refreshSideData();
    }, [refreshSideData]),
  );

  // View state
  const [dayViewDate, setDayViewDate] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [tagPage, setTagPage] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Feed filters (kept from the old Journal)
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);

  // Composer state — v411: the Desk's writing card. The card is
  // in the flow at the head of the feed; its draft is plain text,
  // and the card itself only ever quick-posts a plain Entry.
  // v413 (his ruling, Nov 2): the footer's flat kind link is a
  // DOOR, like the avatar and the Long entry chip — pressing it
  // opens the full Write Page with the kind and the draft already
  // in it; the kind itself is chosen on the Write Page's own kind
  // row. The card's old inline kind chooser is retired. The v204
  // morph and its FAB are retired — the shell's tab bar is never
  // hidden by this tab now, so onComposeChange only ever reports
  // false.
  const [draft, setDraft] = useState("");
  const quickKind: DeskPostKind = "entry";
  const [writePage, setWritePage] = useState<{ kind: DeskPostKind; body: string } | null>(null);
  // v411 (v12): the week's question, pinned into the draft. Set
  // by tapping the question card; the X unpins it and the draft
  // stays. A post made while pinned carries the question.
  const [pinnedQuestion, setPinnedQuestion] = useState<PrayerJournalQuestionRef | null>(null);

  useEffect(() => () => onComposeChange?.(false), [onComposeChange]);

  // v215, carried forward by v411: the Journal's full-page
  // composer stays a link in the ordered back chain (Modal →
  // composer → tab → exit). The v204 morph's link retired with
  // the morph; the Write Page is the composer's full form now, so
  // back while it is open closes the page first — gated on the
  // page being open AND this screen being focused, so it can
  // never fire from under a pushed screen.
  const journalScreenFocused = useIsFocused();
  useEffect(() => {
    if (!writePage || !journalScreenFocused) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setWritePage(null);
      return true;
    });
    return () => sub.remove();
  }, [writePage, journalScreenFocused]);

  // Action sheet + reply + long-form editor state
  const [actionEntry, setActionEntry] = useState<PrayerJournalEntry | null>(null);
  const [actionReply, setActionReply] = useState<PrayerJournalReply | null>(null);
  const [replyTarget, setReplyTarget] = useState<PrayerJournalEntry | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [editingReply, setEditingReply] = useState<{ entry: PrayerJournalEntry; reply: PrayerJournalReply } | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PrayerJournalEntry | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState(new Date());
  const [editMood, setEditMood] = useState<JournalMood | undefined>(undefined);
  const [editColor, setEditColor] = useState<string | undefined>(undefined);
  const [editLocation, setEditLocation] = useState("");
  const [editWeather, setEditWeather] = useState("");
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPeople, setEditPeople] = useState<Person[]>([]);
  // v204: the long-form editor gets the same @ / # autocomplete as
  // the composer, and carries the entry's structural places so an
  // edit never strips them.
  const [editPlaces, setEditPlaces] = useState<PrayerJournalTaggedPlace[]>([]);
  const [editCursor, setEditCursor] = useState(0);
  const [editSelection, setEditSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  const editorInputRef = useRef<TextInput>(null);

  const feedListRef = useRef<FlatList<DeskListItem>>(null);

  // v196: the grouping/filter is lib/journal-moments'
  // momentsFeedItems now (unit-tested round trip). The Day view and
  // the sheets read the raw entries — this filtered list is the
  // ONLY surface a leftover search query can hide a post from,
  // which is why posting clears the filters (revealFreshPost).
  const feedItems = useMemo<FeedItem[]>(
    () => momentsFeedItems(entries, { query, bookmarksOnly }),
    [entries, query, bookmarksOnly],
  );

  // v196: after a post lands, clear every Moments-only filter and
  // bring the feed back to the top, so the fresh entry is visibly
  // standing under today's separator — never "saved somewhere else".
  const revealFreshPost = useCallback(() => {
    setQuery("");
    setSearchOpen(false);
    setBookmarksOnly(false);
    requestAnimationFrame(() => {
      feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  // ── v411: the Desk's derived state ─────────────────────────────
  const filtering = query.trim().length > 0 || bookmarksOnly;
  const deskItems = useMemo<DeskFeedItem[]>(
    () => (filtering ? [] : deskFeedItems(entries, fasts, todayIso)),
    [entries, fasts, todayIso, filtering],
  );
  const todayPostCount = useMemo(() => postsTodayCount(entries, todayIso), [entries, todayIso]);
  const fastChip = useMemo(() => activeFastChip(fasts, todayIso), [fasts, todayIso]);
  const weekQuestion = useMemo(() => weekQuestionFor(fasts, entries, todayIso), [fasts, entries, todayIso]);
  const questionAnswered = weekQuestion ? weekQuestionAnswered(entries, weekQuestion.weekStart) : false;
  const showQuestionCard = Boolean(weekQuestion) && !questionAnswered && !pinnedQuestion && !filtering;
  // v413: the Write Page people picker's Top 5 — the people his
  // journal posts have carried most (his Oct 30 picker rule).
  const topPeopleIds = useMemo(() => rankedTaggedPeopleIds(entries), [entries]);
  const deskWeekLabel = useMemo(() => {
    const parsed = parseDateKey(todayIso);
    const jan1 = new Date(parsed.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((parsed.getTime() - jan1.getTime()) / 86400000) + 1;
    const week = Math.floor((dayOfYear + jan1.getDay()) / 7) + 1;
    return `${parsed.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()} · WEEK ${week}`;
  }, [todayIso]);

  // v204: a structurally stored mention can outlive the person on
  // the People list — resolve those ids from the entries' own
  // snapshots, so the profile the mention points at still opens.
  const activePerson = useMemo(() => {
    if (!personId) return null;
    const listed = people.find((person) => person.id === personId);
    if (listed) return listed;
    for (const entry of entries) {
      const snapshot = entry.taggedPeople.find((tagged) => tagged.id === personId);
      if (snapshot) return { ...snapshot, prayerItems: [] } as unknown as Person;
    }
    return null;
  }, [personId, people, entries]);

  // ── @ / # autocomplete (v204) ────────────────────────────────────
  // The places the # strip can suggest: schedule locations (the
  // Places Path's own strings) plus places his entries carry.
  const knownPlaceNames = useMemo(() => knownPlaces(scheduleEvents, entries), [scheduleEvents, entries]);

  const editToken = useMemo(() => activeTokenAt(editBody, editCursor), [editBody, editCursor]);
  const editPeopleSuggestions = useMemo(
    () => (editToken?.trigger === "@" ? peopleSuggestions(people, editToken.query) : []),
    [editToken, people],
  );
  const editPlaceSuggestions = useMemo(
    () => (editToken?.trigger === "#" ? placeSuggestions(knownPlaceNames, editToken.query) : []),
    [editToken, knownPlaceNames],
  );

  const pickEditPerson = (person: Person) => {
    if (!editToken) return;
    const next = applySuggestion(editBody, editToken, `@${person.name}`);
    setEditBody(next.text);
    setEditCursor(next.cursor);
    setEditSelection({ start: next.cursor, end: next.cursor });
    setEditPeople((current) =>
      current.some((picked) => picked.id === person.id) ? current : [...current, person],
    );
    editorInputRef.current?.focus();
  };

  const pickEditPlace = (name: string) => {
    if (!editToken) return;
    const tag = placeTagFor(name);
    const next = applySuggestion(editBody, editToken, `#${tag}`);
    setEditBody(next.text);
    setEditCursor(next.cursor);
    setEditSelection({ start: next.cursor, end: next.cursor });
    setEditPlaces((current) =>
      current.some((picked) => picked.tag.toLowerCase() === tag.toLowerCase()) ? current : [...current, { name, tag }],
    );
    editorInputRef.current?.focus();
  };

  // ── Entry mutations ──────────────────────────────────────────────────────

  const toggleBookmark = (entry: PrayerJournalEntry) => {
    onChange(togglePrayerJournalBookmark(entries, entry.id));
  };

  const deleteEntry = (entry: PrayerJournalEntry) => {
    onChange(removePrayerJournalEntry(entries, entry.id));
  };

  const saveReply = () => {
    const body = replyBody.trim();
    if (!body) return;
    if (editingReply) {
      onChange(updatePrayerJournalReply(entries, editingReply.entry.id, editingReply.reply.id, body));
    } else if (replyTarget) {
      onChange(addPrayerJournalReply(entries, replyTarget.id, body, createId("reply")));
    }
    setReplyBody("");
    setReplyTarget(null);
    setEditingReply(null);
  };

  const deleteReply = (entry: PrayerJournalEntry, reply: PrayerJournalReply) => {
    onChange(removePrayerJournalReply(entries, entry.id, reply.id));
  };

  // ── Composer ─────────────────────────────────────────────────────────────

  const pickPhotoUris = async (): Promise<string[]> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return [];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.85,
    });
    if (result.canceled) return [];
    return result.assets.map((asset) => asset.uri);
  };

  const pickPhotos = async (target: "editor") => {
    const uris = await pickPhotoUris();
    if (uris.length === 0) return;
    if (target === "editor") setEditPhotos((current) => [...current, ...uris].slice(0, 6));
  };

  // v411: THE posting path — the writing card and the Write Page
  // both land here, and both walk lib/journal-desk's
  // composeDeskPost, so the record (and every place it lands) is
  // identical whichever surface wrote it (v6's rule).
  const postFromDesk = (input: DeskPostInput): boolean => {
    const next = composeDeskPost(entries, input, createId("journal"));
    if (next === entries) return false;
    onChange(next);
    revealFreshPost();
    return true;
  };

  const postQuickCard = () => {
    const posted = postFromDesk({
      kind: quickKind,
      body: draft,
      date: todayIso,
      ...(pinnedQuestion && quickKind === "entry" ? { question: pinnedQuestion } : {}),
    });
    if (posted) {
      setDraft("");
      setPinnedQuestion(null);
    }
  };

  const canPostCard = draft.trim().length > 0;

  const logMoodOnly = (moodId: string) => {
    const next = createPrayerJournalEntry(
      entries,
      { body: "", mood: { id: moodId, intensity: 2 } },
      createId("journal"),
    );
    if (next !== entries) {
      onChange(next);
      revealFreshPost();
    }
  };

  // ── Long-form editor ─────────────────────────────────────────────────────

  const openEditor = (entry?: PrayerJournalEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setEditTitle(entry.title ?? "");
      setEditBody(entry.body);
      setEditDate(parseDateKey(entry.date));
      setEditMood(entry.mood ? { id: entry.mood.id as JournalMood["id"], intensity: entry.mood.intensity } : undefined);
      setEditColor(entry.color);
      setEditLocation(entry.location ?? "");
      setEditWeather(entry.weather ?? "");
      setEditPhotos(entry.photos ?? []);
      // Seed the tag picker from the entry's snapshots: people still
      // on the People list match by id; a snapshot whose person was
      // since removed is carried through as a minimal Person shape
      // (the entry writer only reads the snapshot fields from it).
      setEditPeople(
        entry.taggedPeople.map((tagged) => {
          const match = people.find((person) => person.id === tagged.id);
          return match ?? ({ ...tagged } as unknown as Person);
        }),
      );
      // v204: the entry's structural places ride into the editor
      // and back out on save — an edit never strips them.
      setEditPlaces(entry.places ?? []);
    } else {
      // v411: new entries are born on the Write Page now; the
      // editor's create branch survives only as a fallback and
      // starts empty.
      setEditingEntry(null);
      setEditTitle("");
      setEditBody("");
      setEditDate(new Date());
      setEditMood(undefined);
      setEditColor(undefined);
      setEditLocation("");
      setEditWeather("");
      setEditPhotos([]);
      setEditPeople([]);
      setEditPlaces([]);
    }
    setEditCursor(0);
    setEditSelection(undefined);
    setEditorOpen(true);
  };

  const saveEditor = () => {
    const dateKey = toDateKey(editDate);
    const shared = {
      title: editTitle.trim(),
      body: editBody.trim(),
      mood: editMood,
      color: editColor,
      location: editLocation.trim() || undefined,
      weather: editWeather.trim() || undefined,
      photos: editPhotos.length > 0 ? editPhotos : undefined,
      taggedPeople: editPeople,
      places: editPlaces,
    };
    const next = editingEntry
      ? updatePrayerJournalEntry(entries, editingEntry.id, { ...shared, date: dateKey })
      : createPrayerJournalEntry(entries, { ...shared, date: dateKey }, createId("journal"));
    if (next === entries) return; // nothing saveable (empty, no mood/photo)
    onChange(next);
    // A brand-new entry gets the same reveal as a composer post;
    // an edit keeps the reader where they were.
    if (!editingEntry) revealFreshPost();
    setEditorOpen(false);
    setEditingEntry(null);
  };

  const toggleTaggedPerson = (person: Person) => {
    setEditPeople((current) =>
      current.some((tagged) => tagged.id === person.id)
        ? current.filter((tagged) => tagged.id !== person.id)
        : [...current, person],
    );
  };

  const sheetCallbacks = {
    author,
    people,
    onOpenPerson: (id: string) => setPersonId(id),
    onOpenTag: (tag: string) => setTagPage(tag),
    // v281 (D8): the post footer's bookmark toggle — the same
    // toggle the ··· menu walks.
    onToggleBookmark: (entry: PrayerJournalEntry) => toggleBookmark(entry),
    onShowActions: (entry: PrayerJournalEntry) => {
      setActionReply(null);
      setActionEntry(entry);
    },
    onReplyLongPress: (entry: PrayerJournalEntry, reply: PrayerJournalReply) => {
      setActionEntry(entry);
      setActionReply(reply);
    },
  };

  // ── Day view ─────────────────────────────────────────────────────────────

  if (dayViewDate) {
    return (
      <View style={[styles.container, { backgroundColor: isSkinned ? skinTokens.background ?? undefined : jm.ground }]}>
        <JournalDay
          date={dayViewDate}
          entries={entries}
          events={scheduleEvents}
          fasts={fasts}
          onBack={() => setDayViewDate(null)}
          onChangeDate={setDayViewDate}
          {...sheetCallbacks}
        />
        {renderOverlays()}
      </View>
    );
  }

  // ── v411: the Write Page ─────────────────────────────────────────────────
  // The same composer, opened all the way (v6/v13 Frame 3) — a
  // plain in-place mount like the Day view, sharing this tab's
  // entries and the one posting path, so a post from here lands
  // exactly where a quick post lands.

  if (writePage) {
    return (
      <View style={[styles.container, { backgroundColor: isSkinned ? skinTokens.background ?? undefined : jm.ground }]}>
        <JournalWrite
          jm={jm}
          initialKind={writePage.kind}
          initialBody={writePage.body}
          people={people}
          topPeopleIds={topPeopleIds}
          fasts={fasts}
          todayIso={todayIso}
          question={pinnedQuestion}
          onUnpinQuestion={() => setPinnedQuestion(null)}
          onPickPhotos={pickPhotoUris}
          onPost={(input) => {
            if (postFromDesk(input)) {
              setWritePage(null);
              setDraft("");
              setPinnedQuestion(null);
            }
          }}
          onClose={() => setWritePage(null)}
        />
        {renderOverlays()}
      </View>
    );
  }

  // v411: the kind formats' callbacks — the sheets' own set plus
  // the verse card's door into the Bible reader.
  const kindCallbacks = {
    ...sheetCallbacks,
    onOpenVerse: (entry: PrayerJournalEntry) => {
      if (!entry.verse) return;
      router.push({
        pathname: "/bible-chapter",
        params: { book: entry.verse.book, chapter: String(entry.verse.chapter) },
      });
    },
    onOpenFastDay: (fast: PersonalFast, date: string) => {
      router.push({ pathname: "/fast-day", params: { fastId: fast.id, date } });
    },
  };

  // v411: one Desk feed item → its surface. The order itself is
  // lib/journal-desk's deskFeedItems; this is only the dress.
  const renderDeskItem = (item: DeskFeedItem) => {
    switch (item.type) {
      case "todayLabel":
        return (
          <Text style={[styles.secLabel, { color: skinTokens.isTerminal ? TERM_MID : colors.muted }]}>EARLIER TODAY</Text>
        );
      case "post":
        return <JournalKindPost entry={item.entry} jm={jm} {...kindCallbacks} />;
      case "fastLog":
        return (
          <FastLogCard
            fast={item.fast}
            date={item.date}
            dayNumber={item.dayNumber}
            entries={item.entries}
            jm={jm}
            onOpenDay={kindCallbacks.onOpenFastDay}
            onShowActions={sheetCallbacks.onShowActions}
          />
        );
      case "carried":
        return (
          <View style={[styles.carriedCard, { backgroundColor: jm.tonal }]}>
            <Text style={[styles.carriedLabel, { color: jm.deep }]}>CARRIED THIS WEEK</Text>
            <View style={styles.carriedFaces}>
              {item.people.map((person) => (
                <Pressable key={person.id} onPress={() => setPersonId(person.id)} style={({ pressed }) => [pressed && styles.pressed]}>
                  <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={38} fallbackColor={person.avatarColor} />
                </Pressable>
              ))}
            </View>
            <Text style={[styles.carriedNames, { color: jm.ink }]}>
              {item.people.map((person) => person.name).join(", ")}
            </Text>
          </View>
        );
      case "memory": {
        const memory = item.memory;
        const memoryFast = memory.entry.fastDay
          ? fasts.find((fast) => fast.id === memory.entry.fastDay?.fastId)
          : undefined;
        return (
          <View style={styles.memoryWrap}>
            <Text style={[styles.memoryLabel, { color: jm.deep }]}>
              MEMORIES — ONE WEEK AGO{memory.dayNumber ? `, DAY ${memory.dayNumber}` : ""}
            </Text>
            {memoryFast && memory.entry.fastDay ? (
              <FastLogCard
                fast={memoryFast}
                date={memory.entry.date}
                dayNumber={memory.dayNumber ?? 0}
                entries={getFastDayEntries(entries, memoryFast.id, memory.entry.date)}
                jm={jm}
                bare
                onOpenDay={kindCallbacks.onOpenFastDay}
                onShowActions={sheetCallbacks.onShowActions}
              />
            ) : (
              <JournalKindPost entry={memory.entry} jm={jm} bare {...kindCallbacks} />
            )}
            {memory.keptLine ? <Text style={[styles.memoryKept, { color: jm.inkSoft }]}>{memory.keptLine}</Text> : null}
          </View>
        );
      }
      case "yesterdayHead": {
        const label = parseDateKey(item.date)
          .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          .toUpperCase();
        return (
          <Pressable onPress={() => setDayViewDate(item.date)} style={styles.dayHeadRow}>
            <Text style={[styles.dayHeadText, { color: jm.ink }]}>YESTERDAY — {label}</Text>
            <View style={[styles.dayHeadLine, { backgroundColor: jm.line }]} />
            {item.dayNumber ? (
              <Text style={[styles.dayHeadMeta, { color: jm.inkSoft }]}>
                Day {item.dayNumber}
                {item.kept ? " · kept" : ""}
              </Text>
            ) : null}
          </Pressable>
        );
      }
      case "dayHead": {
        const label = parseDateKey(item.date)
          .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
          .toUpperCase();
        return (
          <Pressable
            onPress={() => setDayViewDate(item.date)}
            style={({ pressed }) => [styles.restDay, { borderColor: jm.line, backgroundColor: jm.card }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Open ${label}`}
          >
            <Text style={[styles.restDayDate, { color: jm.ink }]}>{label}</Text>
            <Text style={[styles.restDayMeta, { color: jm.inkSoft }]}>
              {item.dayNumber ? `Day ${item.dayNumber} · ` : ""}
              {item.count} {item.count === 1 ? "entry" : "entries"}
            </Text>
            <MaterialIcons name="expand-more" size={16} color={jm.inkSoft} />
          </Pressable>
        );
      }
    }
  };

  // ── Moments ──────────────────────────────────────────────────────────────

  // v196: v195 painted the Moments screen with the mockup's own
  // light surface under Classic (white, ink #1D1830, faint
  // #9A92B5, hairline #ECE9F4) — against the rest of his dark app
  // it glared ("Holy bright!"). His ruling: the mockup's layout,
  // his app's surface. The palette is the active skin's own tokens
  // again, exactly as v194 rendered; the flat v195 composition
  // (hairline rows, in-flow day pill, pinned composer) is kept.
  const ink = skinTokens.isTerminal ? TERM_SOFT : colors.foreground;
  const faint = skinTokens.isTerminal ? TERM_MID : colors.muted;
  const momentsSurface = colors.surface;
  const momentsBorder = colors.border;
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : jm.ground,
          // v411: the writing card is in the flow at the head of
          // the feed — the screen pads by the real keyboard height
          // while it is up, so typing in the card is never blind
          // (v196's rule, kept for the Desk's composer).
          paddingBottom: keyboardHeight,
        },
      ]}
    >
      {/* v347: edge-to-edge — the feed's frame reaches the
          screen's literal top (marginTop −insets.top on the list)
          so entries scroll INTO the tray zone and ghost under
          the fade; the content paddingTop returns the inset, so
          at rest the masthead sits exactly where it sat. */}
      <FlatList
        ref={feedListRef}
        data={filtering ? feedItems : deskItems}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, marginTop: -insets.top }}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 + insets.bottom }}
        onScroll={topFadeScrollHandler(fadeScrollY)}
        scrollEventThrottle={16}
        ListHeaderComponent={
          // v202: under Paper the whole masthead — header row, search,
          // filter chips, the day pill — is one sheet laid at the head
          // of the feed; other skins get the plain View as before.
          <PaperSettle>
<BitSettle>
            {/* v281 (D4): the header goes to the drawing — a
                left-aligned title block ("Journal" + the v1
                subline), nothing else in the bar but the furniture
                at the right: the search|calendar pill in the
                family's tonal dress, his avatar keeping its
                write-a-long-entry shortcut, and the bell at the
                masthead's right edge. The app-icon wordmark that
                floated beside the title is gone — no drawing
                carries it. */}
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                {/* v411 (the Desk, v13): the masthead carries the
                    date under the title and the fast's day chip
                    beside it — "Day 305 of the fast" — while a
                    fast is active. */}
                <View style={styles.titleRow}>
                  <Text style={[styles.journalTitle, { color: ink }, skinText(skinTokens, skinTokens.type.screenTitle)]}>Journal</Text>
                  {fastChip && !filtering ? (
                    <View style={[styles.dayChip, { backgroundColor: jm.tonal }]}>
                      <Text style={[styles.dayChipText, { color: jm.deep }]}>{fastChip}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.journalSub, { color: jm.inkSoft }]}>{deskDateLabel(todayIso)}</Text>
              </View>
              <View style={styles.headCluster}>
                <View style={[styles.headPill, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : jm.tonal, borderColor: skinTokens.isTerminal ? momentsBorder : "transparent" }]}>
                  <Pressable
                    accessibilityLabel="Search journal"
                    onPress={() => {
                      // v196: toggling the search bar resets the
                      // query — a filter must never outlive the bar
                      // that shows it (that invisible leftover is
                      // what hid a fresh post from this feed).
                      setSearchOpen((current) => !current);
                      setQuery("");
                    }}
                    style={styles.headPillBtn}
                  >
                    <MaterialIcons name="search" size={20} color={ink} />
                  </Pressable>
                  <View style={[styles.headDivider, { backgroundColor: jm.line }]} />
                  <Pressable accessibilityLabel="Open mood calendar" onPress={() => setCalendarOpen(true)} style={styles.headPillBtn}>
                    <MaterialIcons name="calendar-month" size={20} color={ink} />
                  </Pressable>
                </View>
                <Pressable
                  accessibilityLabel="Write a long entry"
                  onPress={() => setWritePage({ kind: "entry", body: draft })}
                  style={({ pressed }) => [styles.personBtn, { borderColor: momentsBorder }, pressed && styles.pressed]}
                >
                  <AvatarImage id="journal-author" name={author.name} avatarAsset={author.avatarAsset} photoUri={author.photoUri} size={40} fallbackColor="#7C4DFF" />
                </Pressable>
                {headerBell}
              </View>
            </View>

            {searchOpen ? (
              <View style={[styles.searchBar, { backgroundColor: momentsSurface, borderColor: momentsBorder }]}>
                <MaterialIcons name="search" size={18} color={faint} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search moments, people, places…"
                  placeholderTextColor={faint}
                  style={[styles.searchInput, { color: ink }]}
                  autoFocus
                />
                {query ? (
                  <Pressable onPress={() => setQuery("")}>
                    <MaterialIcons name="close" size={18} color={faint} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {/* v281 (D5): the filter chips wear the family's
                tonal dress — filled tonal field, seed-deep ink,
                weight 800, no hairline — instead of white outlined
                pills. The Bookmarks ACTIVE state keeps its
                filled-seed treatment (behavior unchanged). */}
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setBookmarksOnly((current) => !current)}
                style={[
                  styles.filterChip,
                  { backgroundColor: jm.tonal },
                  bookmarksOnly && { backgroundColor: colors.primary },
                  bookmarksOnly
                    ? { ...bitButtonStyle(skinTokens, "primary"), ...termButtonStyle(skinTokens, bookmarksOnly ? "primary" : "secondary") }
                    : {},
                ]}
              >
                <MaterialIcons name="bookmark" size={14} color={bookmarksOnly ? (skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF") : jm.deep} />
                <Text style={[styles.filterChipText, { color: bookmarksOnly ? (skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF") : jm.deep }]}>Bookmarks</Text>
              </Pressable>
              <Pressable onPress={() => setWritePage({ kind: "entry", body: draft })} style={[styles.filterChip, { backgroundColor: jm.tonal }]}>
                <MaterialIcons name="edit-note" size={15} color={jm.deep} />
                <Text style={[styles.filterChipText, { color: jm.deep }]}>Long entry</Text>
              </Pressable>
            </View>

            {/* v411 — the Desk's head: the writing card (hero)
                and, directly under it, the week's question (v13's
                settled order; v11's placement ruling). Both live
                only on the unfiltered home — a search or the
                bookmarks filter returns the head to its furniture. */}
            {!filtering ? (
              <>
                <View style={[styles.writeCard, { backgroundColor: jm.card, borderColor: jm.line, shadowColor: jm.shadow }]}>
                  <View style={styles.writeHead}>
                    <Text style={[styles.writeTitle, { color: jm.ink }]}>Today's page</Text>
                    <Text style={[styles.writeDay, { color: jm.inkSoft }]}>{deskWeekLabel}</Text>
                  </View>
                  {pinnedQuestion ? (
                    <View style={[styles.pinnedStrip, { backgroundColor: jm.tonal }]}>
                      <View style={[styles.pinnedBar, { backgroundColor: jm.seed }]} />
                      <Text style={[styles.pinnedText, { color: jm.inkSoft }]}>“{pinnedQuestion.text}”</Text>
                      <Pressable accessibilityLabel="Unpin question" onPress={() => setPinnedQuestion(null)} hitSlop={8}>
                        <MaterialIcons name="close" size={14} color={jm.inkSoft} />
                      </Pressable>
                    </View>
                  ) : null}
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Write it down while it's still today…"
                    placeholderTextColor={jm.inkSoft}
                    multiline
                    style={[styles.writeArea, { color: jm.ink }]}
                  />
                  <View style={[styles.writeFoot, { borderTopColor: jm.line }]}>
                    {/* v413 (his ruling, Nov 2): the footer's kind
                        link opens the full Write Page — the same
                        door the avatar and the Long entry chip are —
                        with the kind and the draft carried in. */}
                    <Pressable
                      onPress={() => setWritePage({ kind: quickKind, body: draft })}
                      style={({ pressed }) => [styles.kindText, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel="Open the full editor"
                    >
                      <MaterialIcons name="edit" size={13} color={jm.deep} />
                      <Text style={[styles.kindTextLabel, { color: jm.deep }]}>{DESK_POST_KIND_LABELS[quickKind]}</Text>
                      <MaterialIcons name="chevron-right" size={12} color={jm.deep} />
                    </Pressable>
                    <Text style={[styles.writeCount, { color: jm.inkSoft }]}>
                      {pinnedQuestion
                        ? "Answering the week's question"
                        : `${todayPostCount} ${todayPostCount === 1 ? "post" : "posts"} today`}
                    </Text>
                    <Pressable
                      onPress={postQuickCard}
                      disabled={!canPostCard}
                      style={({ pressed }) => [
                        styles.postBtn,
                        { backgroundColor: jm.seed, opacity: canPostCard ? 1 : 0.45 },
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Post"
                    >
                      <Text style={styles.postBtnText}>Post</Text>
                    </Pressable>
                  </View>
                </View>

                {showQuestionCard && weekQuestion ? (
                  <Pressable
                    onPress={() => setPinnedQuestion({ text: weekQuestion.text, weekStart: weekQuestion.weekStart })}
                    style={({ pressed }) => [styles.questCard, { borderColor: jm.line, backgroundColor: jm.card }, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel="Answer the week's question"
                  >
                    <View style={styles.questLabel}>
                      <MaterialIcons name="help-outline" size={12} color={jm.deep} />
                      <Text style={[styles.questLabelText, { color: jm.deep }]}>ONE QUESTION, FROM YOUR OWN WEEK</Text>
                    </View>
                    <Text style={[styles.questText, { color: jm.ink }]}>{weekQuestion.text}</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

          </BitSettle>
</PaperSettle>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: jm.tonal, borderColor: jm.line, borderRadius: skinTokens.cardRadius ?? 12 }]}>
            <MaterialIcons name="auto-stories" size={30} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: ink }]}>{bookmarksOnly ? "No bookmarks yet" : "No moments yet"}</Text>
            <Text style={[styles.emptyText, { color: faint }]}>
              {bookmarksOnly
                ? "Bookmark a moment from its ··· menu and it will wait for you here."
                : "Write the first one in the card above — a sentence, a photo, or just how the day feels."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          // v411: Desk items carry `type`; Moments items carry `kind`.
          if ("type" in item) {
            return renderDeskItem(item);
          }
          if (item.kind === "separator") {
            return (
              <PaperSettle index={index} style={styles.separator}>
<BitSettle index={index}>
                <Text
                  style={[
                    styles.separatorText,
                    {
                      // v196: the separator takes the palette's
                      // muted again — the v195 mockup-faint only
                      // existed for the forced white surface, which
                      // is reversed (see the palette note above).
                      color: skinTokens.isEightBit ? BIT_ON_DUSK : skinTokens.isTerminal ? TERM_MID : colors.muted,
                    },
                    bitText(11),
                  ]}
                >
                  {formatPrayerJournalDate(item.date)}
                </Text>
                <Pressable onPress={() => setDayViewDate(item.date)} hitSlop={8}>
                  <Text style={[styles.separatorLink, { color: jm.deep }]}>Open day</Text>
                </Pressable>
              </BitSettle>
</PaperSettle>
            );
          }
          // v202: each Moment settles onto the feed as its own sheet
          // under Paper (first mount only — FlatList keeps the
          // instance, so scrolling never replays it).
          return (
            <PaperSettle index={index}>
<BitSettle index={index}>
              <JournalPost entry={item.entry} entranceIndex={index} {...sheetCallbacks} />
            </BitSettle>
</PaperSettle>
          );
        }}
      />

      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          feed dissolves under the journal's own ground at the top
          edge instead of cutting off hard. The composer morph
          (zIndex 30) and everything after it paint above the fade. */}
      <TopFade color={(skinTokens.isEightBit || skinTokens.isTerminal) ? skinTokens.background ?? jm.ground : jm.ground} scrollY={fadeScrollY} topInset={insets.top} />

      {renderOverlays()}
    </View>
  );

  function renderOverlays() {
    const item = actionEntry;
    return (
      <>
        {activePerson ? (
          <PersonSheet person={activePerson} entries={entries} onClose={() => setPersonId(null)} {...sheetCallbacks} />
        ) : null}
        {tagPage ? <TagSheet tag={tagPage} entries={entries} onClose={() => setTagPage(null)} {...sheetCallbacks} /> : null}
        <CalendarSheet
          visible={calendarOpen}
          entries={entries}
          onClose={() => setCalendarOpen(false)}
          onSelectDay={(date) => {
            setCalendarOpen(false);
            setDayViewDate(date);
          }}
          onLogMood={logMoodOnly}
        />

        {/* Entry / reply action sheet */}
        <Modal transparent visible={item !== null} animationType="fade" onRequestClose={() => setActionEntry(null)}>
          <View style={styles.modalRoot}>
            <Pressable style={styles.backdrop} onPress={() => setActionEntry(null)} />
            {item ? (
              <View style={[styles.actionSheet, { backgroundColor: jm.card }]}>
                <Text style={[styles.actionTitle, { color: colors.foreground }]} numberOfLines={1}>
                  {item.title || formatPrayerJournalDate(item.date)}
                </Text>
                <Text style={[styles.actionSub, { color: colors.muted }]}>
                  {formatClock(item.createdAt)}
                  {item.isBookmarked ? " · Bookmarked" : ""}
                </Text>
                {actionReply ? (
                  <>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        setEditingReply({ entry: item, reply: actionReply });
                        setReplyBody(actionReply.body);
                        setActionEntry(null);
                        setActionReply(null);
                      }}
                    >
                      <MaterialIcons name="edit" size={19} color={colors.primary} />
                      <Text style={[styles.actionLabel, { color: colors.foreground }]}>Edit reply</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        deleteReply(item, actionReply);
                        setActionEntry(null);
                        setActionReply(null);
                      }}
                    >
                      <MaterialIcons name="delete-outline" size={19} color={colors.error} />
                      <Text style={[styles.actionLabel, { color: colors.error }]}>Delete reply</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        setReplyTarget(item);
                        setReplyBody("");
                        setActionEntry(null);
                      }}
                    >
                      <MaterialIcons name="reply" size={19} color={colors.primary} />
                      <Text style={[styles.actionLabel, { color: colors.foreground }]}>Reply</Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        openEditor(item);
                        setActionEntry(null);
                      }}
                    >
                      <MaterialIcons name="edit" size={19} color={colors.primary} />
                      <Text style={[styles.actionLabel, { color: colors.foreground }]}>Edit entry</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.actionButton,
                        { ...bitButtonStyle(skinTokens, item.isBookmarked ? "primary" : "secondary"), ...termButtonStyle(skinTokens, item.isBookmarked ? "primary" : "secondary") },
                      ]}
                      onPress={() => {
                        toggleBookmark(item);
                        setActionEntry(null);
                      }}
                    >
                      <MaterialIcons
                        name={item.isBookmarked ? "bookmark" : "bookmark-border"}
                        size={19}
                        color={skinTokens.isEightBit ? bitButtonInk(item.isBookmarked ? "primary" : "secondary") : skinTokens.isTerminal ? termButtonInk(item.isBookmarked ? "primary" : "secondary") : colors.primary}
                      />
                      <Text
                        style={[
                          styles.actionLabel,
                          { color: skinTokens.isEightBit ? bitButtonInk(item.isBookmarked ? "primary" : "secondary") : skinTokens.isTerminal ? termButtonInk(item.isBookmarked ? "primary" : "secondary") : colors.foreground },
                        ]}
                      >
                        {item.isBookmarked ? "Remove bookmark" : "Bookmark"}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionButton}
                      onPress={() => {
                        deleteEntry(item);
                        setActionEntry(null);
                      }}
                    >
                      <MaterialIcons name="delete-outline" size={19} color={colors.error} />
                      <Text style={[styles.actionLabel, { color: colors.error }]}>Delete entry</Text>
                    </Pressable>
                  </>
                )}
                <Pressable style={[styles.actionButton, styles.actionCancel]} onPress={() => setActionEntry(null)}>
                  <Text style={[styles.actionLabel, { color: colors.muted, textAlign: "center", flex: 1 }]}>Cancel</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </Modal>

        {/* Reply composer — v196: the sheet pads by the real
            keyboard height (same hook as the Moments composer);
            the old iOS-only KeyboardAvoidingView left it under the
            keyboard on Android too. */}
        <Modal transparent visible={replyTarget !== null || editingReply !== null} animationType="slide" onRequestClose={() => { setReplyTarget(null); setEditingReply(null); }}>
          <View style={[styles.modalRoot, { paddingBottom: keyboardHeight }]}>
            <Pressable style={styles.backdrop} onPress={() => { setReplyTarget(null); setEditingReply(null); }} />
            <View style={[styles.replySheet, { backgroundColor: jm.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
              <Text style={[styles.replyTitle, { color: colors.foreground }]}>{editingReply ? "Edit reply" : "Reply to this moment"}</Text>
              <TextInput
                value={replyBody}
                onChangeText={setReplyBody}
                placeholder="Write a reply…"
                placeholderTextColor={colors.muted}
                multiline
                autoFocus
                style={[styles.replyInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
              />
              <View style={styles.replyActions}>
                <Pressable onPress={() => { setReplyTarget(null); setEditingReply(null); setReplyBody(""); }} style={[styles.replyBtn, { borderColor: colors.border }]}>
                  <Text style={{ color: colors.muted, fontWeight: "700" }}>Cancel</Text>
                </Pressable>
                <Pressable onPress={saveReply} style={[styles.replyBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Save reply</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Long-form editor */}
        <Modal visible={editorOpen} animationType="slide" onRequestClose={() => setEditorOpen(false)}>
          <View style={[styles.editorRoot, { backgroundColor: jm.ground, paddingTop: insets.top + 12 }]}>
            <View style={styles.editorHead}>
              <Text style={[styles.editorTitle, { color: colors.foreground }]}>{editingEntry ? "Edit entry" : "New entry"}</Text>
              <Pressable onPress={() => setEditorOpen(false)} hitSlop={10}>
                <MaterialIcons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>
            {/* v196: the extra bottom room grows by the keyboard
                height so any editor field (and the Save button)
                can be scrolled clear of the keyboard. */}
            <ScrollView contentContainerStyle={{ paddingBottom: 40 + keyboardHeight }} keyboardShouldPersistTaps="handled">
              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Title (optional)"
                placeholderTextColor={colors.muted}
                style={[styles.editorInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface, fontWeight: "700" }]}
              />
              {editPeopleSuggestions.length > 0 || editPlaceSuggestions.length > 0 ? (
                <View style={[styles.suggestStripBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {editPeopleSuggestions.map((person) => (
                    <Pressable
                      key={person.id}
                      onPress={() => pickEditPerson(person)}
                      style={({ pressed }) => [styles.suggestRow, pressed && styles.pressed]}
                    >
                      <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={28} fallbackColor={person.avatarColor} />
                      <Text style={[styles.suggestName, { color: colors.foreground }]} numberOfLines={1}>{person.name}</Text>
                      <Text style={[styles.suggestHint, { color: colors.muted }]}>@mention</Text>
                    </Pressable>
                  ))}
                  {editPlaceSuggestions.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => pickEditPlace(name)}
                      style={({ pressed }) => [styles.suggestRow, pressed && styles.pressed]}
                    >
                      <MaterialIcons name="place" size={18} color={colors.muted} />
                      <Text style={[styles.suggestName, { color: colors.foreground }]} numberOfLines={1}>{name}</Text>
                      <Text style={[styles.suggestHint, { color: colors.muted }]}>#{placeTagFor(name)}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <TextInput
                ref={editorInputRef}
                value={editBody}
                onChangeText={setEditBody}
                selection={editSelection}
                onSelectionChange={(event) => {
                  setEditCursor(event.nativeEvent.selection.start);
                  setEditSelection(event.nativeEvent.selection);
                }}
                placeholder="Write the moment… #tags and @mentions work here"
                placeholderTextColor={colors.muted}
                multiline
                textAlignVertical="top"
                style={[styles.editorInput, styles.editorBody, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
              />

              <Text style={[styles.editorLabel, { color: colors.muted }]}>Mood</Text>
              <MoodPicker value={editMood} onChange={setEditMood} />
              {editMood ? (
                <Pressable onPress={() => setEditMood(undefined)}>
                  <Text style={{ color: colors.error, fontWeight: "600", marginTop: 6 }}>Clear mood</Text>
                </Pressable>
              ) : null}

              <Text style={[styles.editorLabel, { color: colors.muted }]}>Photos</Text>
              <View style={styles.draftPhotos}>
                {editPhotos.map((uri) => (
                  <View key={uri}>
                    <Image source={{ uri }} style={styles.draftPhoto} contentFit="cover" />
                    <Pressable
                      accessibilityLabel="Remove photo"
                      onPress={() => setEditPhotos((current) => current.filter((candidate) => candidate !== uri))}
                      style={styles.draftPhotoRemove}
                    >
                      <MaterialIcons name="close" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={() => void pickPhotos("editor")} style={[styles.addPhotoBtn, { borderColor: colors.border }]}>
                  <MaterialIcons name="add-a-photo" size={20} color={colors.primary} />
                </Pressable>
              </View>

              <DateTimePicker
                value={toDateKey(editDate)}
                onChange={(value) => setEditDate(parseDateKey(value))}
                mode="date"
                label="Date"
              />

              <Text style={[styles.editorLabel, { color: colors.muted }]}>Card color</Text>
              <View style={styles.colorRow}>
                <Pressable
                  onPress={() => setEditColor(undefined)}
                  style={[styles.colorSwatch, styles.colorNone, { borderColor: editColor === undefined ? colors.primary : colors.border }]}
                >
                  <MaterialIcons name="block" size={16} color={colors.muted} />
                </Pressable>
                {JOURNAL_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setEditColor(color)}
                    style={[styles.colorSwatch, { backgroundColor: color, borderColor: editColor === color ? colors.foreground : "transparent" }]}
                  />
                ))}
              </View>

              <View style={styles.editorRow}>
                <TextInput
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Location"
                  placeholderTextColor={colors.muted}
                  style={[styles.editorInput, styles.editorHalf, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
                <TextInput
                  value={editWeather}
                  onChangeText={setEditWeather}
                  placeholder="Weather"
                  placeholderTextColor={colors.muted}
                  style={[styles.editorInput, styles.editorHalf, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface }]}
                />
              </View>

              {people.length > 0 ? (
                <>
                  <Text style={[styles.editorLabel, { color: colors.muted }]}>Tag people</Text>
                  <View style={styles.peopleChips}>
                    {people.map((person) => {
                      const selected = editPeople.some((tagged) => tagged.id === person.id);
                      return (
                        <Pressable
                          key={person.id}
                          onPress={() => toggleTaggedPerson(person)}
                          style={[
                            styles.personChip,
                            { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + "1A" : colors.surface },
                          ]}
                        >
                          <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={20} fallbackColor={person.avatarColor} />
                          <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 13 }}>{person.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Pressable
                onPress={saveEditor}
                style={[styles.saveBtn, { backgroundColor: colors.primary }, bitButtonStyle(skinTokens, "primary")]}
              >
                <Text style={[styles.saveBtnText, { color: skinTokens.isEightBit ? bitButtonInk("primary") : "#FFFFFF" }]}>
                  {editingEntry ? "Save changes" : "Save entry"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
      </>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pressed: { opacity: 0.7 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  personBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // v281 (D4): the title block sits at the left; the right cluster
  // carries pill, avatar and bell.
  titleBlock: { flex: 1, minWidth: 0 },
  journalTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
  journalSub: { fontSize: 12.5, fontWeight: "600", marginTop: 1 },
  headCluster: { flexDirection: "row", alignItems: "center", gap: 10 },
  headPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 4,
    shadowColor: "#1E1246",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headPillBtn: { padding: 7 },
  headDivider: { width: 1, height: 18 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14.5 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  // v281 (D5): no hairline on the tonal chips; weight 800.
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: { fontSize: 12.5, fontWeight: "800" },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 2,
  },
  separatorText: { fontSize: 12.5, fontWeight: "700" },
  separatorLink: { fontSize: 12.5, fontWeight: "700" },
  emptyCard: {
    margin: 16,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  // v195: in-flow day pill — a full-width row in the feed header
  // with the mockup's pastel count chips and avatar stack, not a
  // floating overlay.
  suggestStripBox: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 4,
    marginBottom: 12,
  },
  suggestRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestName: { flex: 1, fontSize: 14.5, fontWeight: "700" },
  suggestHint: { fontSize: 12, fontWeight: "600" },
  draftPhotos: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  draftPhoto: { width: 56, height: 56, borderRadius: 12 },
  draftPhotoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1D1830",
    alignItems: "center",
    justifyContent: "center",
  },
  // v411 — the Desk's styles.
  titleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  dayChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
  dayChipText: { fontSize: 11, fontWeight: "800" },
  writeCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 15,
    paddingTop: 14,
    paddingBottom: 13,
    shadowOpacity: 1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  writeHead: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  writeTitle: { fontSize: 15.5, fontWeight: "800" },
  writeDay: { marginLeft: "auto", fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8 },
  pinnedStrip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 11,
  },
  pinnedBar: { width: 3, alignSelf: "stretch", borderRadius: 99 },
  pinnedText: { flex: 1, fontSize: 12.5, lineHeight: 17.5, fontStyle: "italic", fontWeight: "600" },
  writeArea: { marginTop: 10, minHeight: 56, fontSize: 14, lineHeight: 21, textAlignVertical: "top" },
  writeFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 11,
    marginTop: 8,
  },
  kindText: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 5, paddingHorizontal: 2 },
  kindTextLabel: { fontSize: 12.5, fontWeight: "800" },
  writeCount: { fontSize: 11.5, fontWeight: "700", marginLeft: "auto" },
  postBtn: { borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 },
  postBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  questCard: {
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  questLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  questLabelText: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.8 },
  questText: { fontSize: 15, lineHeight: 21, fontWeight: "700" },
  secLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    paddingHorizontal: 18,
    marginTop: 16,
    marginBottom: 2,
  },
  carriedCard: { marginHorizontal: 14, marginTop: 14, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 13 },
  carriedLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.8, marginBottom: 9 },
  carriedFaces: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  carriedNames: { fontSize: 13, lineHeight: 19, marginTop: 9, fontWeight: "600" },
  memoryWrap: { marginHorizontal: 14, marginTop: 14 },
  memoryLabel: { fontSize: 9.5, fontWeight: "800", letterSpacing: 1.6, marginBottom: 8 },
  memoryKept: { fontSize: 11.5, fontWeight: "700", marginTop: 7 },
  dayHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    marginTop: 19,
    marginBottom: 2,
  },
  dayHeadText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 1.3 },
  dayHeadLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dayHeadMeta: { fontSize: 11.5, fontWeight: "700" },
  restDay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  restDayDate: { fontSize: 12.5, fontWeight: "800", letterSpacing: 0.4 },
  restDayMeta: { fontSize: 12, fontWeight: "600", marginLeft: "auto" },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(24,12,50,0.35)" },
  actionSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 28, gap: 4 },
  actionTitle: { fontSize: 16, fontWeight: "800" },
  actionSub: { fontSize: 12.5, marginBottom: 8 },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 6, borderRadius: 10 },
  actionLabel: { fontSize: 15, fontWeight: "600" },
  actionCancel: { justifyContent: "center", marginTop: 6 },
  replySheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, gap: 12 },
  replyTitle: { fontSize: 16, fontWeight: "800" },
  replyInput: { borderWidth: 1, borderRadius: 14, padding: 12, minHeight: 90, fontSize: 15, textAlignVertical: "top" },
  replyActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  replyBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9 },
  editorRoot: { flex: 1, paddingHorizontal: 18 },
  editorHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  editorTitle: { fontSize: 20, fontWeight: "800" },
  editorInput: { borderWidth: 1, borderRadius: 14, padding: 13, fontSize: 15, marginBottom: 12 },
  editorBody: { minHeight: 130 },
  editorLabel: { fontSize: 12, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase", marginTop: 10, marginBottom: 8 },
  dateButton: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, padding: 12, alignSelf: "flex-start" },
  colorRow: { flexDirection: "row", gap: 9, flexWrap: "wrap" },
  colorSwatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  colorNone: { backgroundColor: "transparent" },
  editorRow: { flexDirection: "row", gap: 10, marginTop: 14 },
  editorHalf: { flex: 1, marginBottom: 0 },
  peopleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  personChip: { flexDirection: "row", alignItems: "center", gap: 7, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  addPhotoBtn: { width: 56, height: 56, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 22 },
  saveBtnText: { fontSize: 15.5, fontWeight: "800" },
});
