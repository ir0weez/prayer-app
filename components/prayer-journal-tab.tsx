import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import ReAnimated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AvatarImage } from "@/components/avatar-system";
import { DateTimePicker } from "@/components/date-time-picker";
import { JournalDay } from "@/components/journal-day";
import { JournalPost, type JournalAuthor } from "@/components/journal-post";
import { CalendarSheet, PersonSheet, TagSheet } from "@/components/journal-sheets";
import { MoodFace } from "@/components/mood-face";
import { PaperSettle, paperPressedLift } from "@/components/paper-motion";
import { BitSettle, bitPressedSnap } from "@/components/bit-motion";
import { MOODS, MoodPicker, type JournalMood } from "@/components/mood-picker";
import { useColors } from "@/hooks/use-colors";
import { useKeyboardHeight } from "@/hooks/use-keyboard-height";
import { useSkin } from "@/hooks/use-skin";
import {
  activeTokenAt,
  addDaysToIso,
  applySuggestion,
  dayCounts,
  formatClock,
  isoDateOf,
  knownPlaces,
  momentsFeedItems,
  peopleSuggestions,
  placeSuggestions,
  placeTagFor,
  type ActiveToken,
  type MomentsFeedItem,
} from "@/lib/journal-moments";
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
  type PrayerJournalReply,
  type PrayerJournalTaggedPlace,
} from "@/lib/prayer-journal";
import type { PersonalFast } from "@/lib/prayercircle-fasting";
import { FASTS_STORAGE_KEY, PROFILE_STORAGE_KEY } from "@/lib/prayercircle-storage";
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
type FeedItem = MomentsFeedItem;

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
export function PrayerJournalTab({ entries, people, onChange, onComposeChange }: PrayerJournalTabProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { isSkinned, tokens: skinTokens, motion: skinMotion } = useSkin();
  const { width: windowWidth } = useWindowDimensions();
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
      const [eventsRaw, fastsRaw, profileRaw] = await Promise.all([
        AsyncStorage.getItem(SCHEDULE_EVENTS_KEY),
        AsyncStorage.getItem(FASTS_STORAGE_KEY),
        AsyncStorage.getItem(PROFILE_STORAGE_KEY),
      ]);
      if (eventsRaw) {
        const parsed: unknown = JSON.parse(eventsRaw);
        if (Array.isArray(parsed)) setScheduleEvents(parsed as ScheduleEvent[]);
      }
      if (fastsRaw) {
        const parsed: unknown = JSON.parse(fastsRaw);
        if (Array.isArray(parsed)) setFasts(parsed as PersonalFast[]);
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
  }, []);
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

  // Composer state
  const [draft, setDraft] = useState("");
  const [draftMood, setDraftMood] = useState<JournalMood | null>(null);
  const [draftPhotos, setDraftPhotos] = useState<string[]>([]);
  const [moodRowOpen, setMoodRowOpen] = useState(false);
  const [tagWord, setTagWord] = useState("");
  const [tagRowOpen, setTagRowOpen] = useState(false);

  // v204 — the composer is a MORPH, not a bar (his asks, Oct 23).
  // At rest there is no composer at all: the tab bar shows and a
  // "+" FAB floats where the shell's FAB floats on the other tabs.
  // Tapping it runs ONE fluid animation — the FAB expands into the
  // text box in the tab bar's place (the shell hides the bar; see
  // onComposeChange) — and tapping out, posting, or the close
  // button reverses it. The box is CLEAR (frosted, translucent):
  // the solid grey bar that sat under everything is gone in every
  // state. The morph timing is the skin's own settle config —
  // timing only, no springs, like every dialect in the app.
  const [composing, setComposing] = useState(false);
  const composerInputRef = useRef<TextInput>(null);
  // The @ / # autocomplete reads the token at the cursor; the
  // selection is mirrored so a pick can splice text and leave the
  // cursor exactly after the inserted name.
  const [draftCursor, setDraftCursor] = useState(0);
  const [draftSelection, setDraftSelection] = useState<{ start: number; end: number } | undefined>(undefined);
  // Picks are stored structurally on the entry when it posts —
  // people as taggedPeople snapshots, places as {name, tag} — the
  // same models the entry already had, now actually fed.
  const [draftMentions, setDraftMentions] = useState<Person[]>([]);
  const [draftPlaces, setDraftPlaces] = useState<PrayerJournalTaggedPlace[]>([]);
  const morphProgress = useSharedValue(0);
  const morphKeyboardLift = useSharedValue(0);
  const morphContentHeight = useSharedValue(56);

  useEffect(() => {
    morphProgress.value = withTiming(composing ? 1 : 0, skinMotion.settle);
  }, [composing, morphProgress, skinMotion]);
  useEffect(() => {
    morphKeyboardLift.value = withTiming(keyboardHeight, { duration: 200, easing: Easing.out(Easing.quad) });
  }, [keyboardHeight, morphKeyboardLift]);
  // The shell hears about compose state (and stops hearing it the
  // moment the Day view replaces Moments, or the tab unmounts).
  useEffect(() => {
    onComposeChange?.(composing && !dayViewDate);
  }, [composing, dayViewDate, onComposeChange]);
  useEffect(() => () => onComposeChange?.(false), [onComposeChange]);

  const morphStyle = useAnimatedStyle(() => {
    const progress = morphProgress.value;
    return {
      width: 58 + (windowWidth - 20 - 58) * progress,
      height: 58 + (Math.max(morphContentHeight.value, 58) - 58) * progress,
      marginRight: 15 - 5 * progress,
      marginBottom: 60 - 8 * progress + morphKeyboardLift.value * progress,
      borderRadius: 29 - 3 * progress,
    };
  });
  const morphContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0.3, 0.9], [0, 1]),
  }));
  const morphFabStyle = useAnimatedStyle(() => ({
    opacity: interpolate(morphProgress.value, [0, 0.35], [1, 0]),
  }));

  const openCompose = useCallback(() => {
    setComposing(true);
    // Focus as the box lands, so the keyboard's rise meets the
    // morph instead of racing it.
    setTimeout(() => composerInputRef.current?.focus(), 280);
  }, []);
  const closeCompose = useCallback(() => {
    setComposing(false);
    composerInputRef.current?.blur();
    Keyboard.dismiss();
  }, []);

  // v215: Android back while the composer is open folds the morph
  // FIRST (his ask — the ordered back chain: Modal → composer →
  // tab → exit). This handler is the composer's own link in that
  // chain: it exists only while composing AND only while this
  // screen is the focused route, so it can never fire from under a
  // pushed screen (the same defect class the shell's handler had).
  // Registered when the composer opens — after the shell's handler
  // — so in BackHandler's LIFO order it is consulted first, and
  // closeCompose here is the very same dismiss the keyboard-hide
  // button and the tap-out backdrop call.
  const journalScreenFocused = useIsFocused();
  useEffect(() => {
    if (!composing || !journalScreenFocused) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeCompose();
      return true;
    });
    return () => sub.remove();
  }, [composing, journalScreenFocused, closeCompose]);

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

  const feedListRef = useRef<FlatList<FeedItem>>(null);

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

  const todayCounts = useMemo(() => dayCounts(entries, scheduleEvents, todayIso), [entries, scheduleEvents, todayIso]);
  const yesterdayCounts = useMemo(
    () => dayCounts(entries, scheduleEvents, yesterdayIso),
    [entries, scheduleEvents, yesterdayIso],
  );
  const showYesterdayPeek = todayCounts.entries === 0 && yesterdayCounts.entries > 0 && !query && !bookmarksOnly;

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

  const draftToken = useMemo(() => activeTokenAt(draft, draftCursor), [draft, draftCursor]);
  const draftPeople = useMemo(
    () => (draftToken?.trigger === "@" ? peopleSuggestions(people, draftToken.query) : []),
    [draftToken, people],
  );
  const draftPlaceNames = useMemo(
    () => (draftToken?.trigger === "#" ? placeSuggestions(knownPlaceNames, draftToken.query) : []),
    [draftToken, knownPlaceNames],
  );

  const pickDraftPerson = (person: Person) => {
    if (!draftToken) return;
    const next = applySuggestion(draft, draftToken, `@${person.name}`);
    setDraft(next.text);
    setDraftCursor(next.cursor);
    setDraftSelection({ start: next.cursor, end: next.cursor });
    setDraftMentions((current) =>
      current.some((picked) => picked.id === person.id) ? current : [...current, person],
    );
    composerInputRef.current?.focus();
  };

  const pickDraftPlace = (name: string) => {
    if (!draftToken) return;
    const tag = placeTagFor(name);
    const next = applySuggestion(draft, draftToken, `#${tag}`);
    setDraft(next.text);
    setDraftCursor(next.cursor);
    setDraftSelection({ start: next.cursor, end: next.cursor });
    setDraftPlaces((current) =>
      current.some((picked) => picked.tag.toLowerCase() === tag.toLowerCase()) ? current : [...current, { name, tag }],
    );
    composerInputRef.current?.focus();
  };

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

  const pickPhotos = async (target: "quick" | "editor") => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.85,
    });
    if (result.canceled) return;
    const uris = result.assets.map((asset) => asset.uri);
    if (target === "quick") setDraftPhotos((current) => [...current, ...uris].slice(0, 6));
    else setEditPhotos((current) => [...current, ...uris].slice(0, 6));
  };

  const postQuick = () => {
    let body = draft.trim();
    const tag = tagWord.trim().replace(/^#/, "").toLowerCase();
    if (tag) body = body ? `${body} #${tag}` : `#${tag}`;
    const next = createPrayerJournalEntry(
      entries,
      {
        body,
        date: todayIso,
        mood: draftMood ?? undefined,
        photos: draftPhotos.length > 0 ? draftPhotos : undefined,
        // v204: the @ / # picks land structurally on the entry —
        // taggedPeople snapshots for the people, {name, tag} for
        // the places — so the links are stored, not re-guessed
        // from the text at render time.
        taggedPeople: draftMentions.length > 0 ? draftMentions : undefined,
        places: draftPlaces.length > 0 ? draftPlaces : undefined,
      },
      createId("journal"),
    );
    if (next === entries) return; // nothing postable (empty, no mood/photo)
    onChange(next);
    setDraft("");
    setDraftCursor(0);
    setDraftSelection(undefined);
    setDraftMentions([]);
    setDraftPlaces([]);
    setDraftMood(null);
    setDraftPhotos([]);
    setTagWord("");
    setTagRowOpen(false);
    setMoodRowOpen(false);
    revealFreshPost();
    // Posting completes the morph: the box folds back to the FAB
    // and the tab bar returns.
    closeCompose();
  };

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

  const canPost = draft.trim().length > 0 || draftMood !== null || draftPhotos.length > 0 || tagWord.trim().length > 0;

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
      setEditingEntry(null);
      setEditTitle("");
      setEditBody(draft);
      setEditDate(new Date());
      setEditMood(draftMood ?? undefined);
      setEditColor(undefined);
      setEditLocation("");
      setEditWeather("");
      setEditPhotos(draftPhotos);
      // v204: a long entry started from the composer carries the
      // composer's @ / # picks with it.
      setEditPeople(draftMentions);
      setEditPlaces(draftPlaces);
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
    setDraft("");
    setDraftCursor(0);
    setDraftSelection(undefined);
    setDraftMentions([]);
    setDraftPlaces([]);
    setDraftMood(null);
    setDraftPhotos([]);
    closeCompose();
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
      <View style={[styles.container, { backgroundColor: isSkinned ? skinTokens.background ?? undefined : colors.background }]}>
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
  // The day pill's count chips, as a bg/ink pair per skin (mirrors
  // journal-day's chipBg pattern, with readable ink on each ground).
  const pillChipBg = (pastel: string) => (skinTokens.isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_PANEL : pastel);
  const pillChipInk = skinTokens.isTerminal ? TERM_PHOS : skinTokens.isEightBit ? BIT_ON_DUSK : "#1D1830";
  // v213: the morphing composer's ground — SOLID, in every skin.
  // v204's frost (Classic's surface at 90% over a blur layer;
  // translucent white under Paper) rendered on his phone as a
  // muddy GREY slab with the feed ghosting through it — his
  // verdict, Oct 23: "the grey doesn't really work here in the
  // status update..." The box now wears the Journal's own surface
  // language at full opacity — the same ladder the head pill
  // above uses (terminal panel, then the surface
  // token) — so in light it is the Journal's white, in dark the
  // dark surface, and nothing behind it ever shows through. The
  // morph's own shadow (styles.morph) lifts it off the feed.
  // (8-bit folded into the surface branch: momentsSurface IS
  // colors.surface, its v204 value, unchanged.)
  const composerBackground = skinTokens.isTerminal
      ? TERM_PANEL
      : momentsSurface;
  // The resting FAB wears the shell FAB's own colors per skin.
  const fabBackground = skinTokens.isTerminal ? TERM_PANEL : skinTokens.isEightBit ? BIT_PURPLE : colors.primary;
  const fabInk = skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: (skinTokens.isEightBit || skinTokens.isTerminal) ? "transparent" : skinTokens.background ?? colors.background,
          // v204: the screen no longer pads for the keyboard — the
          // composer is an overlay now, and its own morph lifts by
          // the keyboard height (morphKeyboardLift), so the box
          // still lands directly above the keyboard as v196
          // required, without shifting the whole screen.
        },
      ]}
    >
      <FlatList
        ref={feedListRef}
        data={feedItems}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 148 + insets.bottom }}
        ListHeaderComponent={
          // v202: under Paper the whole masthead — header row, search,
          // filter chips, the day pill — is one sheet laid at the head
          // of the feed; other skins get the plain View as before.
          <PaperSettle>
<BitSettle>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Write a long entry"
                onPress={() => openEditor()}
                style={({ pressed }) => [styles.personBtn, { borderColor: momentsBorder }, pressed && styles.pressed]}
              >
                <AvatarImage id="journal-author" name={author.name} avatarAsset={author.avatarAsset} photoUri={author.photoUri} size={40} fallbackColor="#7C4DFF" />
              </Pressable>
              <View style={styles.wordmark}>
                <Image source={require("../assets/images/icon.png")} style={styles.logoMark} contentFit="contain" />
                <Text style={[styles.journalTitle, { color: ink }, skinText(skinTokens, skinTokens.type.screenTitle)]}>Journal</Text>
              </View>
              <View style={[styles.headPill, { backgroundColor: skinTokens.isTerminal ? TERM_PANEL : momentsSurface, borderColor: momentsBorder }]}>
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
                <View style={[styles.headDivider, { backgroundColor: momentsBorder }]} />
                <Pressable accessibilityLabel="Open mood calendar" onPress={() => setCalendarOpen(true)} style={styles.headPillBtn}>
                  <MaterialIcons name="calendar-month" size={20} color={ink} />
                </Pressable>
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

            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setBookmarksOnly((current) => !current)}
                style={[
                  styles.filterChip,
                  { backgroundColor: momentsSurface, borderColor: momentsBorder },
                  bookmarksOnly && { backgroundColor: colors.primary, borderColor: colors.primary },
                  bookmarksOnly
                    ? { ...bitButtonStyle(skinTokens, "primary"), ...termButtonStyle(skinTokens, bookmarksOnly ? "primary" : "secondary") }
                    : {},
                ]}
              >
                <MaterialIcons name="bookmark" size={14} color={bookmarksOnly ? (skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF") : faint} />
                <Text style={[styles.filterChipText, { color: bookmarksOnly ? (skinTokens.isTerminal ? TERM_PHOS : "#FFFFFF") : faint }]}>Bookmarks</Text>
              </Pressable>
              <Pressable onPress={() => openEditor()} style={[styles.filterChip, { backgroundColor: momentsSurface, borderColor: momentsBorder }]}>
                <MaterialIcons name="edit-note" size={15} color={faint} />
                <Text style={[styles.filterChipText, { color: faint }]}>Long entry</Text>
              </Pressable>
            </View>

            {/* v195: the day pill lives IN the flow at the head of
                the feed, as in the mockup — v194 floated it at a
                fixed bottom offset, where it landed on top of
                entries mid-scroll. */}
            <Pressable
              onPress={() => setDayViewDate(todayIso)}
              style={({ pressed }) => [
                styles.dayPill,
                // v204: flattened to the mockup's shape — an
                // in-flow pill ROW on the one surface, hairline
                // border, no shadow, no panel fill of its own.
                { backgroundColor: "transparent", borderColor: momentsBorder },
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons name="calendar-month" size={16} color="#E4572E" />
              <Text style={[styles.dayPillToday, { color: ink }]}>Today</Text>
              <View style={[styles.dayPillChip, { backgroundColor: pillChipBg("#DFF3DF") }]}>
                <Text style={[styles.dayPillChipText, { color: pillChipInk }]}>
                  {todayCounts.entries} {todayCounts.entries === 1 ? "entry" : "entries"}
                </Text>
              </View>
              <View style={[styles.dayPillChip, { backgroundColor: pillChipBg("#E1EDFB") }]}>
                <Text style={[styles.dayPillChipText, { color: pillChipInk }]}>{todayCounts.photos} photos</Text>
              </View>
              <View style={[styles.dayPillChip, { backgroundColor: pillChipBg("#FBE3EC") }]}>
                <Text style={[styles.dayPillChipText, { color: pillChipInk }]}>{todayCounts.events} events</Text>
              </View>
              <View style={styles.dayPillStack}>
                {todayCounts.people.slice(0, 3).map((person, index) => (
                  <View key={person.id} style={[styles.dayPillAvatar, { marginLeft: index === 0 ? 0 : -8, zIndex: 3 - index }]}>
                    <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={22} fallbackColor={person.avatarColor} />
                  </View>
                ))}
              </View>
              <MaterialIcons name="chevron-right" size={18} color={faint} />
            </Pressable>

            {showYesterdayPeek ? (
              <Pressable
                onPress={() => setDayViewDate(yesterdayIso)}
                style={({ pressed }) => [styles.peek, { backgroundColor: "transparent", borderColor: momentsBorder }, pressed && styles.pressed]}
              >
                <Text style={[styles.peekKicker, { color: faint }]}>Yesterday</Text>
                <Text style={[styles.peekText, { color: ink }]}>
                  {yesterdayCounts.entries} {yesterdayCounts.entries === 1 ? "moment" : "moments"}
                  {yesterdayCounts.events > 0 ? ` and ${yesterdayCounts.events} ${yesterdayCounts.events === 1 ? "event" : "events"}` : ""} — see the whole day
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={faint} />
              </Pressable>
            ) : null}
          </BitSettle>
</PaperSettle>
        }
        ListEmptyComponent={
          <View style={[styles.emptyCard, { backgroundColor: "transparent", borderColor: momentsBorder, borderRadius: skinTokens.cardRadius ?? 12 }]}>
            <MaterialIcons name="auto-stories" size={30} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: ink }]}>{bookmarksOnly ? "No bookmarks yet" : "No moments yet"}</Text>
            <Text style={[styles.emptyText, { color: faint }]}>
              {bookmarksOnly
                ? "Bookmark a moment from its ··· menu and it will wait for you here."
                : "Write the first one below — a sentence, a photo, or just how the day feels."}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
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
                  <Text style={[styles.separatorLink, { color: colors.primary }]}>Open day</Text>
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
              <JournalPost entry={item.entry} {...sheetCallbacks} />
            </BitSettle>
</PaperSettle>
          );
        }}
      />

      {/* v204 — the composer MORPH (his asks, Oct 23). v195–v196's
          always-visible in-flow bar is retired: at rest there is
          NO bar — the tab bar shows, and the "+" FAB floats at the
          shell FAB's own resting place. Tapping it runs one fluid
          animation (morphStyle, on the skin's settle timing): the
          FAB expands into the text box in the tab bar's place —
          the shell hides the bar on onComposeChange — and the box
          rides the keyboard via morphKeyboardLift, keeping v196's
          "never type blind" rule. Tap-out (the clear backdrop),
          posting, or the close button folds it back. v213: the
          box is SOLID — the Journal's surface at full opacity
          (composerBackground above); v204's frost read on his
          phone as a grey slab with the feed ghosting through.
          v202/v203's entrance kits
          still wrap the mount (PaperSettle/BitSettle), so under
          Paper the whole thing settles in, under 8-bit it snaps.
          v215: the wrap and its inner settle are "box-none" now.
          Neither wrapper used to take a pointerEvents prop, so
          the full-screen anchor layer was hit-testable end to
          end: feed pans died inside its subtree before reaching
          the list (his "can't scroll up"), and this tap-out
          backdrop — sitting beneath the layer at zIndex 20 —
          never received a tap either (his tap-out report). With
          box-none, the wrappers' frames are transparent to
          touches while the morph and FAB inside stay tappable:
          pans reach the FlatList, taps-out reach the backdrop. */}
      {composing ? (
        <Pressable accessibilityLabel="Close composer" onPress={closeCompose} style={styles.composeBackdrop} />
      ) : null}
      <PaperSettle style={[styles.composerWrap, { zIndex: 30 }]} pointerEvents="box-none">
<BitSettle pointerEvents="box-none">
        <ReAnimated.View style={[styles.morph, morphStyle, { borderColor: momentsBorder, backgroundColor: composerBackground }]}>
          <ReAnimated.View
            pointerEvents={composing ? "auto" : "none"}
            style={[styles.morphContent, { width: windowWidth - 20 }, morphContentStyle]}
            onLayout={(event) => {
              morphContentHeight.value = withTiming(event.nativeEvent.layout.height, skinMotion.settle);
            }}
          >
            {draftPeople.length > 0 || draftPlaceNames.length > 0 ? (
              <View style={[styles.suggestStrip, { borderBottomColor: momentsBorder }]}>
                {draftPeople.map((person) => (
                  <Pressable
                    key={person.id}
                    onPress={() => pickDraftPerson(person)}
                    style={({ pressed }) => [styles.suggestRow, pressed && styles.pressed]}
                  >
                    <AvatarImage id={person.id} name={person.name} gender={person.gender} avatarAsset={person.avatarAsset} photoUri={person.photoUri} size={28} fallbackColor={person.avatarColor} />
                    <Text style={[styles.suggestName, { color: ink }]} numberOfLines={1}>{person.name}</Text>
                    <Text style={[styles.suggestHint, { color: faint }]}>@mention</Text>
                  </Pressable>
                ))}
                {draftPlaceNames.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => pickDraftPlace(name)}
                    style={({ pressed }) => [styles.suggestRow, pressed && styles.pressed]}
                  >
                    <MaterialIcons name="place" size={18} color={faint} />
                    <Text style={[styles.suggestName, { color: ink }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.suggestHint, { color: faint }]}>#{placeTagFor(name)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {moodRowOpen ? (
              <View style={[styles.composerRow, { borderBottomColor: momentsBorder }]}>
                <Text style={[styles.composerRowLabel, { color: faint }]}>Feels like</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, alignItems: "center" }}>
                  {MOODS.map((mood) => {
                    const selected = draftMood?.id === mood.id;
                    return (
                      <Pressable
                        key={mood.id}
                        onPress={() => setDraftMood(selected ? null : { id: mood.id, intensity: 2 })}
                        style={[styles.moodPick, selected && { backgroundColor: colors.primary + "22", borderColor: colors.primary, borderWidth: 1 }]}
                      >
                        <MoodFace moodId={mood.id} size={24} />
                        <Text style={[styles.moodPickText, { color: ink }]}>{mood.label}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {tagRowOpen ? (
              <View style={[styles.composerRow, { borderBottomColor: momentsBorder }]}>
                <MaterialIcons name="sell" size={16} color={faint} />
                <TextInput
                  value={tagWord}
                  onChangeText={(value) => setTagWord(value.replace(/\s+/g, ""))}
                  placeholder="tag — one word, like garden"
                  placeholderTextColor={faint}
                  autoCapitalize="none"
                  style={[styles.tagInput, { color: ink }]}
                />
                {tagWord ? (
                  <Pressable onPress={() => setTagWord("")}>
                    <MaterialIcons name="close" size={16} color={faint} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {draftPhotos.length > 0 ? (
              <View style={[styles.draftPhotos, { paddingHorizontal: 12, paddingTop: 8, marginBottom: 0 }]}>
                {draftPhotos.map((uri) => (
                  <View key={uri}>
                    <Image source={{ uri }} style={styles.draftPhoto} contentFit="cover" />
                    <Pressable
                      accessibilityLabel="Remove photo"
                      onPress={() => setDraftPhotos((current) => current.filter((candidate) => candidate !== uri))}
                      style={styles.draftPhotoRemove}
                    >
                      <MaterialIcons name="close" size={13} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.composerBar}>
              <Pressable
                accessibilityLabel="Close composer"
                onPress={closeCompose}
                style={[styles.composerBtn, { backgroundColor: "transparent" }]}
              >
                <MaterialIcons name="keyboard-hide" size={19} color={faint} />
              </Pressable>
              <Pressable accessibilityLabel="Add a photo" onPress={() => void pickPhotos("quick")} style={[styles.composerBtn, { backgroundColor: colors.primary }]}>
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
              </Pressable>
              <Pressable
                accessibilityLabel="Add a mood"
                onPress={() => setMoodRowOpen((current) => !current)}
                style={[styles.composerBtn, { backgroundColor: draftMood || moodRowOpen ? colors.primary + "26" : "transparent", borderColor: momentsBorder, borderWidth: draftMood || moodRowOpen ? 0 : 1 }]}
              >
                {draftMood ? <MoodFace moodId={draftMood.id} size={19} /> : <MaterialIcons name="sentiment-satisfied-alt" size={19} color={colors.primary} />}
              </Pressable>
              <TextInput
                ref={composerInputRef}
                value={draft}
                onChangeText={setDraft}
                selection={draftSelection}
                onSelectionChange={(event) => {
                  setDraftCursor(event.nativeEvent.selection.start);
                  setDraftSelection(event.nativeEvent.selection);
                }}
                placeholder="What's up?"
                placeholderTextColor={faint}
                multiline
                style={[styles.composerInput, { color: ink }]}
              />
              <Pressable
                accessibilityLabel="Add a tag"
                onPress={() => setTagRowOpen((current) => !current)}
                style={[styles.composerBtn, { backgroundColor: tagRowOpen || tagWord ? colors.primary + "26" : "transparent", borderColor: momentsBorder, borderWidth: tagRowOpen || tagWord ? 0 : 1 }]}
              >
                <MaterialIcons name="sell" size={17} color={colors.primary} />
              </Pressable>
              <Pressable
                accessibilityLabel="Post"
                onPress={postQuick}
                disabled={!canPost}
                style={[styles.composerBtn, { backgroundColor: canPost ? colors.primary : colors.border }]}
              >
                <MaterialIcons name="arrow-upward" size={19} color="#FFFFFF" />
              </Pressable>
            </View>
          </ReAnimated.View>

          <ReAnimated.View pointerEvents={composing ? "none" : "auto"} style={[styles.morphFabFace, morphFabStyle]}>
            <Pressable
              accessibilityLabel="Write a moment"
              onPress={openCompose}
              style={({ pressed }) => [
                styles.morphFabBtn,
                { backgroundColor: fabBackground },
                pressed && (skinTokens.isPaper ? paperPressedLift(skinTokens, pressed) : skinTokens.isEightBit ? bitPressedSnap(skinTokens, pressed) : styles.pressed),
              ]}
            >
              <MaterialIcons name="add" size={30} color={fabInk} />
            </Pressable>
          </ReAnimated.View>
        </ReAnimated.View>
      </BitSettle>
</PaperSettle>

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
              <View style={[styles.actionSheet, { backgroundColor: colors.surface }]}>
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
            <View style={[styles.replySheet, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) }]}>
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
          <View style={[styles.editorRoot, { backgroundColor: colors.background, paddingTop: insets.top + 12 }]}>
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
  wordmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 30, height: 30 },
  journalTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.3 },
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
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: { fontSize: 12.5, fontWeight: "700" },
  peek: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  peekKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  peekText: { flex: 1, fontSize: 14, fontWeight: "700" },
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
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    // v204: no shadow, no elevation — the pill is a row in the
    // flow (the mockup's shape), not a card floating over it.
  },
  dayPillToday: { fontSize: 14.5, fontWeight: "800", marginRight: 2 },
  dayPillChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  dayPillChipText: { fontSize: 11.5, fontWeight: "800" },
  dayPillStack: { flexDirection: "row", alignItems: "center", marginLeft: "auto" },
  dayPillAvatar: { borderRadius: 999, borderWidth: 2, borderColor: "#FFFFFF", overflow: "hidden" },
  // v204: the settle kits wrap a full-screen anchor layer; the
  // morph itself is the layer's only child, pinned bottom-right
  // where the shell's FAB rests on the other tabs.
  composerWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  composeBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  morph: {
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#1E1246",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  morphContent: {
    position: "absolute",
    left: 0,
    bottom: 0,
  },
  morphFabFace: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
  },
  morphFabBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestStrip: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
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
  composerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerRowLabel: { fontSize: 12.5, fontWeight: "700" },
  moodPick: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  moodPickText: { fontSize: 12.5, fontWeight: "700" },
  tagInput: { flex: 1, fontSize: 14 },
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
  // v204: the bar is a row INSIDE the morph box now — the box
  // carries the border, radius and clipping.
  composerBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 7,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  composerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  composerInput: { flex: 1, fontSize: 15.5, maxHeight: 110, paddingTop: 7, paddingBottom: 7 },
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
