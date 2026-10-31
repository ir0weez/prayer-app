// ─── v205 chapter page ───────────────────────────────────────────────────────
// His polished Notion chapter, in the app: sticky topbar with the reading
// hairline, the slim study-status strip, Chapter 01 cover, the Stories
// doorway, Previously/Introduction, Contents, pink section bands, one
// toggle per verse entry, his blocks (callouts where he put them), the
// markup bar on every entry, the raspberry Verses FAB, and the index
// sheet behind it. Noteless chapters render the same page with the whole
// chapter as verse-only entries — the reader, index, search and marking
// tools all stay live.
//
// ─── v250 "The Bible, Material" ─────────────────────────────────────────────
// Concept 1 "Expressive Cards" (his pick, Oct 25 15:50), every hue
// derived from his chosen palette: the sticky header gains the
// mockup's shimmering chapter-progress card (real scroll data — the
// fill is the page's read fraction, the label names the section at
// the scroll head); the mode control is a tonal segmented pill; the
// Stories/Contents doorways are the mockup's amber/teal tonal pills;
// every section is a big tonal CARD in its own derived hue with
// chunky verse numerals in that hue's deep shade; his own Note is
// the filled seed card (SelfLineBlock); Mark as Read is the seed's
// near-black pill with the gold +25 XP chip. Behavior — scroll,
// bubbles, marks, the two tracks — is untouched.
//
// ─── v304 "Room to Read" ─────────────────────────────────────────────
// His word (Oct 28 10:05, Leviticus 23): the header stack "is taking
// up a lot of space... clean this up a bit so I have more room to
// read." Compression, not redesign: the v250 progress CARD collapses
// into a 4px thread at the header's bottom edge (same scroll
// fraction, same seed fill, same shimmer), and its verse-range label
// moves onto ONE slim row shared with a slimmed With notes / Read
// only segmented control. The title row is untouched, every control
// survives, and the v251 measured-header machinery is untouched —
// it simply measures a shorter header now.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Dimensions,
  Easing as RNEasing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Easing } from 'react-native-reanimated';
import type { Person } from '@/lib/prayercircle-data';
import {
  buildDisplaySections,
  buildReadOnlySections,
  chapterCountFor,
  flattenEntries,
  getBookData,
  isBareChapter,
  mergeVerseOnlyEntries,
  parseHashVerseRef,
  splitSectionsByHashNotes,
  type DisplaySection,
} from '@/lib/bible-v205/index';
import { entryKey, type NoteCategory, type StudyStatus, type V205Entry } from '@/lib/bible-v205/types';
import { entrySourceCategory } from '@/lib/bible-v205/categories';
import { loadUserLabels, type UserLabels } from '@/lib/bible-v205/user-labels';
import {
  addKeeperLine,
  applyLinePhraseHighlight,
  applyVersePhraseHighlight,
  isKept,
  lineHighlightsFor,
  loadMarks,
  marksFor,
  rankedAuthorIds,
  removeKeeperLineAt,
  resolvePhraseHighlights,
  resolveTintFields,
  saveMarks,
  scrubPhraseHighlights,
  toggleKept,
  updateKeeperLineAt,
  withMarks,
  type EntryMarks,
  type LineAuthor,
  type MarksMap,
  type TintColor,
  type VersePhraseHighlight,
} from '@/lib/bible-v205/marks';
import {
  buildBubblePieces,
  loadPeopleList,
  loadProfileIdentity,
  resolveBubbleAuthor,
  type BubblePiece,
  type LineStorageTarget,
  type ProfileIdentity,
} from '@/lib/bible-v205/bubbles';
import {
  chapterDisplayMarks,
  chapterReadDate,
  chapterStatus,
  formatReadDate,
  loadStudyState,
  type StudyState,
} from '@/lib/bible-v205/study';
import { markChapterRead, unmarkChapterRead } from '@/lib/bible-v205/rewards';
import {
  chapterHasNotes,
  loadStudioImports,
  resolveChapterData,
  type StudioImportsMap,
} from '@/lib/bible-v205/studio-import';
import { loadChapterVerses, type VerseText } from '@/lib/bible-v205/verses';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import { useSkin } from '@/hooks/use-skin';
import { BlockView, CategoryTag, Ornament, ReadChip, SectionBand, SelfLineBlock, StatusChip } from './blocks';
import { SelectableText, clearActiveSelection, hasActiveSelection } from './selectable-text';
// v381: the registry's standing-selection subscription — the
// page's scroll lock follows it (see selectionStands below).
import { subscribeActiveSelection } from './selectable-text';
import { AuthorFace, AuthorPicker, LivingBubbles, kindLabelFor, spanLabelFor, type BloomTiming } from './bubbles';
import { IndexSheet } from './index-sheet';
import { StoriesView } from './stories-view';
import {
  chapterLabel,
  rangeLabel,
  sectionToneFor,
  tintWashFor,
  useBiblePalette,
  verseTintFor,
  type BiblePalette,
  type BibleSectionTone,
} from './palette';
import { getDevotional } from '@/lib/devotionals';

export interface ChapterPageProps {
  book: string;
  chapter: number;
  /** Open straight into Stories mode (book view's "Read as Stories"). */
  initialStories?: boolean;
  onBack: () => void;
  onOpenBook: () => void;
  onOpenQueue: () => void;
  onNavigateChapter: (chapter: number) => void;
  /** v230 → v293: open this chapter's devotional in the player (only
   * wired when the devotional registry has an entry for this
   * chapter). Doors: beside "Read as Stories" at the chapter's top,
   * and at the start of the Stories slides — both registry-driven. */
  onListen?: () => void;
  /** v259: the app tab bar rides over the reader now — the height
   * it occupies at the screen's foot. The scroll's end spacer
   * grows past it, the Verses FAB lifts above it, and Stories
   * pads its root by it. Absent (0) if ever mounted without it. */
  tabBarHeight?: number;
  /** v265: when the reader lives inside the shell's Study pane,
   * the shell's ScreenContainer has already applied the top
   * safe-area inset — the page must not apply it a second time.
   * The pane passes 0; route mode leaves it undefined (the real
   * inset). */
  topInsetOverride?: number;
}

/** App-level read-mode preference ("With notes" is the default). */
export const READ_MODE_KEY = 'prayercircle.bible.v205.readmode.v1';

/**
 * v251 — the header clearance is MEASURED, never guessed (the v246
 * lesson, applied to this page after his v250 screenshot: the
 * doorway hero's "Chapter 01" rendered UNDER the sticky header —
 * only its bottom ~28px peeked out below the segmented pill,
 * because the header was an in-flow block whose bottom edge the
 * cover's layout never actually cleared on his device). The header
 * is now a measured overlay (the Schedule tab's proven pattern):
 * it reports its own height through onLayout, the ScrollView's
 * content opens with a spacer of exactly that height, and the
 * three scroll consumers that used to carry stale magic constants
 * (scrollToY's −128, the head-section line's +190, the bubble
 * dock's insets.top + 118) all read the same measured height — so
 * the hero clears the header BY CONSTRUCTION at any header height:
 * Listen pill present or not, progress label wrapped or not, any
 * font scale. This estimate only sizes the spacer for the first
 * frame, before the header's own onLayout lands the true height.
 */
export function estimateChapterHeaderHeight(insetsTop: number): number {
  // topbar (insets + 8 pad + ~37 row + 4 pad = 49) + the slim meta
  // row (8 pad + 32 segmented control + 8 pad = 48) + the 4px
  // progress thread + the 1px rule ≈ insets + 102. (v304: the
  // progress card's ~62 and the old mode row's ~52 collapse into
  // the 48 meta row + 4 thread — 62px given back to the reading.)
  return insetsTop + 102;
}

/** Where a scrollToY landing stops, relative to the header's
 * measured bottom edge — a small breathing gap under the rule. */
export const CHAPTER_HEADER_LAND_GAP = 8;

/**
 * v250: the mockup's progress bar, born as a card under the app bar.
 * v304: the same progress, compressed to a 4px thread at the
 * header's bottom edge — the fill is still the ScrollView's measured
 * read fraction in the seed colour, the shimmer still sweeps it
 * (calm 1.5s pass, long rest, still under reduce-motion); only the
 * card chrome and its label row are gone. The label's information
 * (the verse range at the scroll head) rides the slim meta row
 * beside the mode control instead.
 */
function ChapterProgressThread({
  palette,
  progress,
}: {
  palette: BiblePalette;
  progress: number;
}) {
  // v342 (his ruling, Oct 29 14:47, on the Leviticus 23 reader
  // screenshot — the wavy thread "is obviously glitched out"):
  // the chapter thread leaves the wavy set entirely and returns
  // to its pre-v341 form below — a REGULAR straight 4px thread
  // whose fill is the ScrollView's measured read fraction, with
  // the v304 shimmer sweep (calm 1.5s pass, long rest, still
  // under reduce-motion). The wavy rendering also explains the
  // screenshot's sliced labels: the shared component paints an
  // 8px canvas centred on a 4px seat and renders nothing until
  // its width measures, so in this slim header the wave spilled
  // over the meta row and popped in late. The straight thread
  // paints inside its seat from the first frame.
  const shimmer = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (live) setReduced(r);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (reduced || trackW === 0) return;
    shimmer.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1500,
          easing: RNEasing.inOut(RNEasing.ease),
          useNativeDriver: true,
        }),
        Animated.delay(2400),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, trackW, shimmer]);
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  return (
    <View
      testID="chapter-progress-thread"
      style={[styles.progThread, { backgroundColor: palette.raspTint }]}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      <View style={[styles.progThreadFill, { backgroundColor: palette.rasp, width: `${pct}%` }]} />
      {!reduced && trackW > 0 ? (
        <Animated.View
          style={[
            styles.progShimmer,
            {
              transform: [
                {
                  translateX: shimmer.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-trackW * 0.55, trackW * 1.08],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

export function ChapterPageView(props: ChapterPageProps) {
  const { book, chapter } = props;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  // v265: inside the Study pane the shell already applied this
  // inset — the override (0) keeps the header from double-stepping.
  const topInset = props.topInsetOverride ?? insets.top;
  const palette = useBiblePalette();
  // v230: this chapter's devotional, if the registry carries one.
  const devotional = useMemo(() => getDevotional(book, chapter), [book, chapter]);
  const { skin, motion: skinMotion, isSkinned } = useSkin();
  // v222: studio-imported chapter data (Settings → DATA → Import studio
  // pack), when one exists for this chapter; the shipped chapter stands
  // otherwise. Declared before chapterData, which resolves through it.
  const [studioImports, setStudioImports] = useState<StudioImportsMap>({});
  const chapterData = useMemo(
    () => resolveChapterData(book, chapter, studioImports),
    [book, chapter, studioImports],
  );
  const totalChapters = chapterCountFor(book);

  const [verses, setVerses] = useState<VerseText[]>([]);
  const [versesLoaded, setVersesLoaded] = useState(false);
  const [marks, setMarks] = useState<MarksMap>({});
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [labels, setLabels] = useState<UserLabels | null>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean> | null>(null);
  const [sheet, setSheet] = useState<null | 'verses' | 'search'>(null);
  // v361: the selection model replaced the v212 number-tap tint
  // selection wholesale — a drag across the words IS the selection
  // now, and it lives inside SelectableText. All the page holds is
  // whether a drag is live (its scroll locks for the drag, so the
  // two never fight over the same finger).
  const [selectionDrag, setSelectionDrag] = useState(false);
  // v381: SELECTION MODE — the scroll lock's second, load-bearing
  // half. v361–v378 locked the scroll only while a drag callback
  // said a drag was live, so the lock's timing raced the finger:
  // it landed a beat after the long-press and released the moment
  // a drag ended, though the selection still stood — and the next
  // adjusting touch raced the scroll again ("sometimes it wants
  // to scroll, other times it wants to move the cursor"). Now the
  // lock also follows whether a selection STANDS, reported by
  // SelectableText's own registry — the one place that knows —
  // so the page does not scroll at all for the selection's whole
  // life, and scrolls again the instant it clears. Every
  // SelectableText on this page (the verses, his own lines)
  // rides this one ScrollView, so the registry's word is the
  // page's whole truth.
  const [selectionStands, setSelectionStands] = useState(() => hasActiveSelection());
  useEffect(() => subscribeActiveSelection(setSelectionStands), []);
  // v361: composer-seat extents — each entry whose mark cluster is
  // standing reports the cluster's bottom edge within the entry,
  // so the seat check below can keep the unfurled composer's
  // Cancel/Save row clear of the floating Verses pill (his
  // screenshot, 2026-10-30: Cancel half-buried, Save unreachable).
  const seatExtentsRef = useRef(new Map<string, number>());
  const [seatSpacer, setSeatSpacer] = useState(0);
  // v214: the Living Bubble layer — the People list (the same stored
  // list the Journal's @mentions read, so author ids mean the same
  // person in both places), his profile identity for his own face,
  // and the one entry whose bubbles are open (mutual exclusion).
  const [people, setPeople] = useState<Person[]>([]);
  const [profile, setProfile] = useState<ProfileIdentity>({ name: '' });
  const [openBubblesKey, setOpenBubblesKey] = useState<string | null>(null);
  const scrollYRef = useRef(0);
  // v251: the sticky header's MEASURED height — the header reports
  // it through onLayout; the ref mirrors it for the scroll
  // callbacks, which must never read a stale render's state.
  const [headerH, setHeaderH] = useState(() => estimateChapterHeaderHeight(topInset));
  const headerHRef = useRef(headerH);
  const [stories, setStories] = useState(!!props.initialStories);
  const [progress, setProgress] = useState(0);
  // v250: the section at the scroll head — the progress card's label
  // names it ("Ver. 1–8 of 37 verses"), from the sections' measured
  // positions, never a decorative number.
  const [headSectionEnd, setHeadSectionEnd] = useState<number | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);
  const yByKey = useRef(new Map<string, number>());
  const viewHeight = useRef(0);
  const contentHeight = useRef(0);

  useEffect(() => {
    let live = true;
    setVersesLoaded(false);
    loadChapterVerses(book, chapter)
      .then((v) => {
        if (!live) return;
        setVerses(v);
        setVersesLoaded(true);
      })
      .catch(() => {
        // Offline or unconfigured KJV fetch: the page, his notes, the
        // index and the marking tools still stand; verses fill in when
        // the text can be reached.
        if (!live) return;
        setVerses([]);
        setVersesLoaded(true);
      });
    loadMarks().then((m) => live && setMarks(m));
    loadStudyState().then((s) => live && setStudyState(s));
    loadStudioImports().then((m) => live && setStudioImports(m));
    loadPeopleList().then((p) => live && setPeople(p));
    loadProfileIdentity().then((p) => live && setProfile(p));
    return () => {
      live = false;
    };
  }, [book, chapter, chapterData]);

  // The read-mode preference is app-level: the page reopens the way he
  // left it. Switching modes never touches notes, marks, or states.
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(READ_MODE_KEY)
      .then((v) => live && setReadOnly(v === 'read-only'))
      .catch(() => undefined);
    loadUserLabels().then((l) => live && setLabels(l));
    return () => {
      live = false;
    };
  }, []);
  const chooseReadMode = (only: boolean) => {
    setReadOnly(only);
    AsyncStorage.setItem(READ_MODE_KEY, only ? 'read-only' : 'with-notes').catch(() => undefined);
  };

  const verseCount = verses.length ? verses[verses.length - 1].verse : 0;
  const rawNotesSections: DisplaySection[] = useMemo(
    () => buildDisplaySections(chapterData, verseCount),
    [chapterData, verseCount],
  );
  // v210: '#' verse splitting — render-time only. His marks stay stored
  // on the parent entry key; the split sections carry derived records at
  // the piece keys, and displayMarks is the map every render lookup
  // below resolves against. The stored map is never written from here.
  const notesSplit = useMemo(
    () => splitSectionsByHashNotes(rawNotesSections, marks, book, chapter),
    [rawNotesSections, marks, book, chapter],
  );
  const notesSections = notesSplit.sections;
  const sections: DisplaySection[] = useMemo(
    () => (readOnly ? buildReadOnlySections(chapterData, verseCount) : notesSections),
    [readOnly, chapterData, verseCount, notesSections],
  );
  const displayMarks: MarksMap = readOnly ? marks : notesSplit.marks;
  // v207: Stories on a bare chapter (no notes, no groupings) paces by
  // ≤3-verse slides in BOTH modes. With-notes gets them from
  // buildDisplaySections' chunked fallback; read-only sections stay
  // per-verse for the reader, so Stories alone receives the merged
  // sections — same chunk boundaries, so kept marks agree across modes.
  const storyBase: DisplaySection[] = useMemo(
    () => (readOnly && isBareChapter(chapterData) ? mergeVerseOnlyEntries(sections) : sections),
    [readOnly, chapterData, sections],
  );
  // v210: Stories consumes the same splits as the page. With-notes
  // sections arrive already split; read-only Stories re-chunks first
  // (mergeVerseOnlyEntries above), so its split runs AFTER that step.
  const storySplit = useMemo(
    () =>
      readOnly
        ? splitSectionsByHashNotes(storyBase, marks, book, chapter)
        : // With-notes Stories walks the very sections + split the
          // page renders (storyBase === notesSections in this mode).
          notesSplit,
    [readOnly, storyBase, marks, book, chapter, notesSplit],
  );

  // v214/v217: the line pieces of this chapter — derived from the
  // WITH-notes split in both modes, partitioned by authorship (his
  // own lines render in flow; other people's anchor as margin
  // faces). With-notes renders each piece on its own entry;
  // Read-only (per-verse entries) anchors a piece's lines on the
  // verse where the piece starts.
  const bubblePieces = useMemo(
    () => buildBubblePieces(notesSplit, book, chapter),
    [notesSplit, book, chapter],
  );
  const bubbleByStart = useMemo(() => {
    const map = new Map<number, BubblePiece>();
    for (const piece of bubblePieces.values()) map.set(piece.start, piece);
    return map;
  }, [bubblePieces]);
  // v356: the note composer's Top 5, ranked from the attribution
  // stored across the WHOLE marks map (every book, every chapter).
  const topAuthorIds = useMemo(() => rankedAuthorIds(marks), [marks]);
  // The bloom's timing: the locked mockup numbers in the default
  // skin (380ms, cubic-bezier(0.22, 1, 0.36, 1)); material skins
  // speak their own settle dialect for the same morph, the way the
  // Journal's composer morph does (v213).
  const bloom: BloomTiming = useMemo(
    () =>
      isSkinned
        ? skinMotion.settle
        : { duration: 380, easing: Easing.bezier(0.22, 1, 0.36, 1) },
    [isSkinned, skinMotion],
  );
  const storySections = storySplit.sections;

  // v214 (his ask, 2026-10-23 18:04): while any bubbles are open, the
  // Android back action — button or edge-swipe gesture — folds them
  // shut and is consumed; it never leaves the chapter. With nothing
  // open, back behaves exactly as before (no listener registered).
  useEffect(() => {
    if (!openBubblesKey || stories || sheet) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpenBubblesKey(null);
      return true;
    });
    return () => sub.remove();
  }, [openBubblesKey, stories, sheet]);

  const flat = useMemo(() => flattenEntries(sections), [sections]);
  // The read-only kept fallback walks COVERING with-notes entries; it
  // reads the unsplit sections so a verse's covering entry is the one
  // its marks were actually stored on.
  const notesFlat = useMemo(() => flattenEntries(rawNotesSections), [rawNotesSections]);
  const verseText = useMemo(() => new Map(verses.map((v) => [v.verse, v.text])), [verses]);
  const status: StudyStatus = studyState ? chapterStatus(studyState, book, chapter) : 'none';
  // v228: the READ track, displayed on this page but never derived
  // from the notes status above — the two marks are independent.
  const readDate: string | null = studyState ? chapterReadDate(studyState, book, chapter) : null;
  // The display model — on a chapter with NO notes and NO writing
  // status the strip headlines READ off a real read mark, never off
  // a notes state (chapterDisplayMarks in study.ts; v329).
  const display = studyState
    ? chapterDisplayMarks(studyState, book, chapter, chapterHasNotes(book, chapter, studioImports))
    : null;

  const keptTotal = flat.filter((f) =>
    isKept(displayMarks, book, chapter, f.entry.start, f.entry.end, f.entry.blocks.some((b) => b.kind === 'highlight')),
  ).length;

  const isOpen = (e: V205Entry) => {
    const key = entryKey(book, chapter, e.start, e.end);
    if (openMap && key in openMap) return openMap[key];
    if (readOnly) return true;
    return e.blocks.length > 0;
  };
  const toggleOpen = (e: V205Entry) => {
    const key = entryKey(book, chapter, e.start, e.end);
    setOpenMap((m) => ({ ...(m ?? {}), [key]: !isOpen(e) }));
  };

  const entryStatus = useMemo(() => {
    const map = new Map<string, { kept: boolean; hasHighlight: boolean; hasScripture: boolean; category: NoteCategory | null }>();
    for (const f of flat) {
      const key = entryKey(book, chapter, f.entry.start, f.entry.end);
      const m = displayMarks[key];
      let kept = isKept(displayMarks, book, chapter, f.entry.start, f.entry.end, f.entry.blocks.some((b) => b.kind === 'highlight'));
      if (readOnly && !kept) {
        // A kept grouped entry in With-notes mode keeps its verses in
        // Read-only too — the marks layer is one layer in both modes.
        const covering = notesFlat.find((nf) => f.entry.start >= nf.entry.start && f.entry.start <= nf.entry.end);
        if (covering) {
          kept = isKept(displayMarks, book, chapter, covering.entry.start, covering.entry.end, covering.entry.blocks.some((b) => b.kind === 'highlight'));
        }
      }
      map.set(key, {
        kept,
        hasHighlight: f.entry.blocks.some((b) => b.kind === 'highlight') || (m?.highlights.length ?? 0) > 0,
        hasScripture: f.entry.blocks.some((b) => b.kind === 'scripture'),
        category: m?.category ?? entrySourceCategory(f.entry.blocks),
      });
    }
    return map;
  }, [flat, notesFlat, displayMarks, book, chapter, readOnly]);

  const userCategories = useMemo(() => {
    const map = new Map<string, NoteCategory | null>();
    for (const [key, m] of Object.entries(displayMarks)) map.set(key, m.category ?? null);
    return map;
  }, [displayMarks]);

  const scrollToY = (y: number) => {
    // v251: the landing offset is the header's MEASURED height
    // (+ a small gap), not the old hard-coded 128 — the header is
    // taller than that since the v250 progress card, and a stale
    // constant is what buried landings under the pill.
    scrollRef.current?.scrollTo({
      y: Math.max(0, y - headerHRef.current - CHAPTER_HEADER_LAND_GAP),
      animated: true,
    });
  };
  // v361: the composer seat check. An entry with a standing mark
  // cluster reports the cluster's bottom edge (content coordinates
  // via yByKey + the within-entry extent); whenever a report lands,
  // if that bottom would sit under the floating Verses pill's band
  // (tab bar + the pill's own seat), scroll just far enough to lift
  // it clear — growing the foot spacer first when the chapter's own
  // scroll range cannot reach (a composer near the foot). When no
  // cluster stands, the spacer goes home.
  const ensureSeatVisible = () => {
    if (seatExtentsRef.current.size === 0) {
      setSeatSpacer(0);
      return;
    }
    const vh = viewHeight.current > 0 ? viewHeight.current : Dimensions.get('window').height;
    const reserve = (props.tabBarHeight ?? 0) + SEAT_FAB_CLEARANCE_PX;
    let worst = 0;
    for (const [key, bottomWithin] of seatExtentsRef.current) {
      const entryY = yByKey.current.get(key);
      if (entryY === undefined) continue;
      const need = entryY + bottomWithin + 10 - (vh - reserve);
      if (need > worst) worst = need;
    }
    if (worst <= scrollYRef.current + 1) return;
    const maxScroll = Math.max(0, contentHeight.current - vh);
    if (worst > maxScroll) {
      setSeatSpacer(Math.ceil(worst - maxScroll) + 8);
    }
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: worst, animated: true });
    }, 60);
  };
  const landOnVerse = (verse: number) => {
    setSheet(null);
    const target = flat.find((f) => verse >= f.entry.start && verse <= f.entry.end);
    if (!target) return;
    const key = entryKey(book, chapter, target.entry.start, target.entry.end);
    if (!isOpen(target.entry)) {
      setOpenMap((m) => ({ ...(m ?? {}), [key]: true }));
    }
    // Give the opened body one frame to lay out, then land + flash.
    setTimeout(() => {
      const y = yByKey.current.get(key);
      if (y !== undefined) scrollToY(y);
      setFlashKey(key);
      flashAnim.setValue(1);
      Animated.timing(flashAnim, { toValue: 0, duration: 1600, useNativeDriver: false }).start(() =>
        setFlashKey(null),
      );
    }, 60);
  };

  const handleToggleKept = async (start: number, end: number, sourceHasHighlight: boolean) => {
    // v210: on a split piece (no record stored at the piece key yet) the
    // toggle flips the RESOLVED kept the reader sees — which may have
    // been inherited from the parent entry's record — and stores the
    // flip at the piece key, where the display merge lets it win.
    const key = entryKey(book, chapter, start, end);
    const next = marks[key]
      ? toggleKept(marks, book, chapter, start, end, sourceHasHighlight)
      : withMarks(marks, book, chapter, start, end, {
          kept: !(entryStatus.get(key)?.kept ?? sourceHasHighlight),
        });
    setMarks(next);
    await saveMarks(next);
  };
  const handleAddLine = async (
    start: number,
    end: number,
    kind: 'highlight' | 'thought' | 'note',
    text: string,
    author?: LineAuthor | null,
  ) => {
    const next = addKeeperLine(marks, book, chapter, start, end, kind, text, author ?? null);
    setMarks(next);
    await saveMarks(next);
  };
  // v214: bubble edits write through the line's STORAGE target (a
  // line displayed on a split piece may live on the parent entry's
  // record — see resolveLineStorage).
  const handleUpdateLine = async (target: LineStorageTarget, patch: { text?: string; author?: LineAuthor | null }) => {
    const next = updateKeeperLineAt(marks, book, chapter, target.start, target.end, target.field, target.index, patch);
    setMarks(next);
    await saveMarks(next);
  };
  const handleRemoveLine = async (target: LineStorageTarget) => {
    const next = removeKeeperLineAt(marks, book, chapter, target.start, target.end, target.field, target.index);
    setMarks(next);
    await saveMarks(next);
  };
  // v212: the span a tint write for a rendered entry lands on. In
  // Read-only the rendered span is a single verse, but its marks live
  // on the covering with-notes entry; in With-notes the rendered span
  // is the entry (or split piece) itself.
  const tintWriteSpan = (start: number, end: number): { start: number; end: number } => {
    if (!readOnly) return { start, end };
    const covering = notesFlat.find((nf) => start >= nf.entry.start && start <= nf.entry.end);
    return covering ? { start: covering.entry.start, end: covering.entry.end } : { start, end };
  };
  // v361: a tint chosen from the selection bar on a VERSE's words.
  // The write discipline is the v212 one, at phrase grain: resolve
  // the span's ranges against the DISPLAY map (split pieces carry
  // their partitions there), apply onto that list, write the result
  // to the covering entry's record (tintWriteSpan), then scrub the
  // range's overlaps off every OTHER record covering the verse, so
  // no resolution path can repaint what the bar just changed — and
  // no toggled-off range resurrects from a parent record.
  const handlePhraseTint = async (
    start: number,
    end: number,
    verse: number,
    range: { start: number; end: number },
    tint: TintColor,
  ) => {
    const span = tintWriteSpan(start, end);
    const resolved = resolvePhraseHighlights(displayMarks, book, chapter, span.start, span.end);
    const nextList = applyVersePhraseHighlight(resolved, { verse, start: range.start, end: range.end, tint });
    let next = withMarks(marks, book, chapter, span.start, span.end, { phraseHighlights: nextList });
    next = scrubPhraseHighlights(
      next,
      book,
      chapter,
      verse,
      range.start,
      range.end,
      entryKey(book, chapter, span.start, span.end),
    );
    setMarks(next);
    await saveMarks(next);
  };
  // v361: a tint chosen from the selection bar inside one of HIS
  // lines. The line's storage target IS the address — the write
  // lands on the record the line lives on, nowhere else, and the
  // render looks the ranges up through the same target.
  const handleLinePhraseTint = async (
    target: LineStorageTarget,
    range: { start: number; end: number },
    tint: TintColor,
  ) => {
    const rec = marksFor(marks, book, chapter, target.start, target.end);
    const nextList = applyLinePhraseHighlight(rec.lineHighlights, target, { ...range, tint });
    const next = withMarks(marks, book, chapter, target.start, target.end, { lineHighlights: nextList });
    setMarks(next);
    await saveMarks(next);
  };
  // v228 — the reader's ONLY mark control (his ruling): Mark as Read.
  // The notes-written state is set from the book grid's editor and
  // the studio, never here — a Complete button on the reading surface
  // is exactly where the two marks got confused.
  const handleMarkRead = async () => {
    if (!studyState) return;
    const result = await markChapterRead(studyState, book, chapter, undefined, studioImports);
    setStudyState(result.state);
  };
  const handleClearRead = async () => {
    if (!studyState) return;
    setStudyState(await unmarkChapterRead(studyState, book, chapter));
  };
  // v273: one toggle for the Stories end screen's Mark as Read —
  // the same two handlers above, chosen by the chapter's current
  // read mark. No second mark implementation lives in Stories.
  const handleToggleRead = async () => {
    if (readDate !== null) await handleClearRead();
    else await handleMarkRead();
  };
  const allComplete =
    studyState !== null &&
    totalChapters > 0 &&
    Array.from({ length: totalChapters }, (_, i) => i + 1).every(
      (c) => chapterStatus(studyState, book, c) === 'complete',
    );
  // v206: the strip's state words come from the app alone — the v205
  // strings that credited "the database" are gone with the seed.
  const stripText =
    status === 'complete'
      ? `Chapter ${chapter} — notes finished${allComplete ? `; all ${totalChapters} chapters of ${book} are Complete.` : '.'}`
      : status === 'in-progress'
        ? `Chapter ${chapter} — notes in progress.`
        : status === 'write'
          ? `Chapter ${chapter} — on the Next list, waiting to be written.`
          : status === 'restudy'
            ? `Chapter ${chapter} — on the Current list, waiting to be re-studied.`
            : status === 'not-started'
              ? `Chapter ${chapter} — marked not started yet.`
              : `Chapter ${chapter} — no notes state recorded yet. It is set from the book grid, not here.`;

  const content = stories ? (
    <StoriesView
      book={book}
      display={book}
      chapter={chapter}
      chapterData={chapterData}
      sections={storySections}
      verses={verses}
      marks={storySplit.marks}
      palette={palette}
      people={people}
      profile={profile}
      onToggleKept={handleToggleKept}
      possessive={labels?.possessive ?? 'Your'}
      possessiveLower={labels?.possessiveLower ?? 'your'}
      bottomInset={props.tabBarHeight}
      devotional={devotional}
      onListenDevotional={props.onListen}
      onExit={() => setStories(false)}
      onNextChapter={chapter < totalChapters ? () => props.onNavigateChapter(chapter + 1) : null}
      readDate={readDate}
      onToggleRead={studyState ? handleToggleRead : null}
    />
  ) : (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      {/* ── topwrap ── v251: a measured overlay (styles.topwrap is
          absolute); it reports its true height here, and the
          ScrollView below opens its content with a spacer of
          exactly that height — the hero can never slide under it. */}
      <View
        style={[styles.topwrap, { backgroundColor: palette.paper, borderBottomColor: palette.line }]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (Math.abs(h - headerHRef.current) > 0.5) {
            headerHRef.current = h;
            setHeaderH(h);
          }
        }}
      >
        <View style={[styles.topbar, { paddingTop: topInset + 8 }]}>
          <Pressable onPress={props.onBack} hitSlop={10} style={styles.topBtn}>
            <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.ink }]} numberOfLines={1}>
            {book} · {chapterLabel(chapter)}
          </Text>
          <View style={styles.topActions}>
            <View style={[styles.keptPill, { backgroundColor: palette.noteTagBg }]}>
              <Text style={{ color: palette.rasp, fontSize: 13 }}>♥</Text>
              <Text style={[styles.keptPillText, { color: palette.raspDeep }]}>{keptTotal} kept</Text>
            </View>
            {/* v313: the drawing's read pill — when the chapter
                carries a read mark, the topbar says so in the read
                channel's dress (deep fill, white words). */}
            {readDate ? (
              <View
                testID="chapter-header-read-pill"
                style={[styles.keptPill, { backgroundColor: palette.raspDeep }]}
                accessibilityLabel={`Chapter read ${formatReadDate(readDate)}`}
              >
                <MaterialIcons name="bookmark" size={14} color="#FFFFFF" />
                <Text style={[styles.keptPillText, { color: '#FFFFFF' }]}>Read</Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => setSheet('verses')}
              hitSlop={8}
              style={[styles.iconBtn, { backgroundColor: palette.raspTint }]}
              accessibilityLabel="Verse index"
            >
              <MaterialIcons name="grid-view" size={19} color={palette.raspDeep} />
            </Pressable>
            <Pressable
              onPress={() => setSheet('search')}
              hitSlop={8}
              style={[styles.iconBtn, { backgroundColor: palette.raspTint }]}
              accessibilityLabel="Search this chapter"
            >
              <MaterialIcons name="search" size={20} color={palette.raspDeep} />
            </Pressable>
          </View>
        </View>
        {/* v304: ONE slim row under the title bar. The progress
            card's verse-range label sits at its left (compact,
            muted); the mode control — the same tonal segmented
            pill, slimmed — at its right. The progress card itself
            is gone; its fill lives on as the thread below. */}
        <View style={styles.metaRow}>
          <Text
            testID="chapter-verse-range"
            style={[styles.metaRange, { color: palette.inkSoft }]}
            numberOfLines={1}
          >
            {verseCount > 0
              ? `Ver. 1–${headSectionEnd ?? sections[0]?.end ?? verseCount} of ${verseCount} verses`
              : ''}
          </Text>
          <View style={[styles.modeSeg, { borderColor: palette.line }]}>
            <Pressable
              style={[styles.modeBtn, !readOnly ? { backgroundColor: palette.band } : null]}
              onPress={() => chooseReadMode(false)}
            >
              <Text style={[styles.modeBtnText, { color: !readOnly ? palette.raspDeep : palette.inkSoft }]}>With notes</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, readOnly ? { backgroundColor: palette.band } : null]}
              onPress={() => chooseReadMode(true)}
            >
              <Text style={[styles.modeBtnText, { color: readOnly ? palette.raspDeep : palette.inkSoft }]}>Read only</Text>
            </Pressable>
          </View>
        </View>
        {/* v304: the progress thread — the card's scroll-fraction
            fill on a 4px line spanning the header's bottom edge. */}
        <ChapterProgressThread palette={palette} progress={progress} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.page}
        // v249 (his ruling, 2026-10-25 15:17): the page scrolls
        // while a bubble thread is open — the v244 lock is gone.
        // The bubble layer rides in this content's own coordinates,
        // anchored to its entry, so it travels with the chapter and
        // stays on its verses; the blur strips over-cover so the
        // greyout and tap-to-close survive the travel, and the
        // thread's own region still scrolls internally when a
        // conversation is tall.
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          viewHeight.current = layoutMeasurement.height;
          contentHeight.current = contentSize.height;
          scrollYRef.current = contentOffset.y;
          const max = contentSize.height - layoutMeasurement.height;
          setProgress(max > 0 ? Math.min(1, contentOffset.y / max) : 0);
          // v250: the section at the scroll head, from the measured
          // section positions — the last section whose top has
          // scrolled up to the header line. v251: the header line is
          // the header's MEASURED bottom edge (this was a hard-coded
          // +190 that no longer matched the real header).
          let headEnd: number | null = null;
          for (const s of sections) {
            const y = yByKey.current.get(`secwrap-${s.start}`);
            if (y !== undefined && y <= contentOffset.y + headerHRef.current) headEnd = s.end;
          }
          setHeadSectionEnd((prev) => (prev === headEnd ? prev : headEnd));
        }}
        scrollEventThrottle={32}
        // v361: while a text drag-selection is live the page holds
        // still — the drag and the scroll never fight over a finger.
        // v381: the hold now lasts the selection's whole life, not
        // just its drags — while a selection stands the page does
        // not scroll AT ALL, so an adjusting touch can never be
        // read as a scroll. Entering selection mode also freezes
        // a scroll already in flight: the flip to false halts the
        // scroll where it stands, and nothing on selection entry
        // issues a scrollTo, so the position never jumps.
        scrollEnabled={!selectionDrag && !selectionStands}
      >
        {/* v251: the measured header spacer — the content's first
            box is exactly the overlay header's measured height, so
            at rest the status strip and the doorway hero begin
            below the header's bottom edge BY CONSTRUCTION (the
            Schedule tab's spacer pattern). Nothing is allowed to
            render above this line. */}
        <View pointerEvents="none" style={{ height: headerH }} />
        {/* ── slim status strip — v228: passive display only. The
            notes chip and words describe the notes-written track;
            the read mark rides beside them when present. Nothing on
            this strip changes a state any more — the Queue link only
            navigates. v234: the strip's two marks wear the same two
            family labels as the book panel — COMMENTARY for the
            notes-written line, STUDY for the read line — so the two
            tracks never blur into one another here either. ── */}
        <View style={[styles.strip, { backgroundColor: palette.raspTint }, palette.cardDress]}>
          <View style={styles.stripMain}>
            {display?.headline === 'read' ? (
              <View style={styles.stripLine}>
                <Text style={[styles.stripLabel, { color: palette.inkSoft }]}>Study</Text>
                <ReadChip palette={palette} />
                <Text style={[styles.stripText, { color: palette.ink }]}>
                  {/* v329: headline 'read' now implies a real read
                      mark, so the date always stands here. The v233
                      fallback sentence ("a Complete here counts as
                      Read") is retired — Complete counts as Written. */}
                  {readDate
                    ? `Chapter ${chapter} — read ${formatReadDate(readDate)}. No notes for this chapter — reading is the whole mark.`
                    : `Chapter ${chapter} — read. No notes for this chapter — reading is the whole mark.`}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.stripLine}>
                  <Text style={[styles.stripLabel, { color: palette.inkSoft }]}>Commentary</Text>
                  <StatusChip status={status} palette={palette} />
                  <Text style={[styles.stripText, { color: palette.ink }]}>{stripText}</Text>
                </View>
                {readDate ? (
                  <View style={styles.stripLine}>
                    <Text style={[styles.stripLabel, { color: palette.inkSoft }]}>Study</Text>
                    <Text style={[styles.stripText, { color: palette.inkSoft, fontWeight: '700' }]}>{`✓ Read ${formatReadDate(readDate)}`}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
          <Pressable onPress={props.onOpenQueue} hitSlop={8}>
            <Text style={[styles.stripLink, { color: palette.raspDeep }]}>Queue ›</Text>
          </Pressable>
        </View>

        {/* ── cover ── */}
        <View style={styles.cover}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>{readOnly || !chapterData ? 'King James Version' : 'Commentary'}</Text>
          <Text style={[styles.coverH, { color: palette.ink }]}>{chapterLabel(chapter)}</Text>
          <Text style={[styles.coverBook, { color: palette.inkSoft }]}>{getBookData(book)?.display ?? book}</Text>
          <Ornament palette={palette} />
          <Text style={[styles.coverNote, { color: palette.inkSoft }]}>
            {readOnly || !chapterData
              ? 'The chapter itself, read straight through — marking tools and the index work here too.'
              : 'Every verse, with your notes exactly as written — tap a verse to open your words.'}
          </Text>
        </View>

        {/* ── ReStudy surface card ── */}
        {status === 'restudy' ? (
          <View style={[styles.surfCard, { backgroundColor: palette.paper2 }, palette.cardDress]}>
            <View style={styles.surfHead}>
              <StatusChip status="restudy" palette={palette} />
              <Text style={[styles.surfTitle, { color: palette.ink }]}>Due another read</Text>
            </View>
            <Text style={[styles.surfBody, { color: palette.inkSoft }]}>
              This chapter sits in your Current list — notes finished, waiting for a second pass on the same ground.
            </Text>
            <View style={styles.surfBtns}>
              <Pressable
                style={[styles.surfBtn, styles.surfBtnPrimary, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={props.onOpenQueue}
              >
                <Text style={styles.surfBtnPrimaryText}>Open in Queue</Text>
              </Pressable>
              <Pressable style={[styles.surfBtn, { borderColor: palette.lineDark }, palette.btnDress]} onPress={() => scrollToY(0)}>
                <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13 }}>Read Chapter</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Stories doorway ── */}
        {/* v313: the drawing's doorway — the doors themselves, no
            explanatory paragraph above or below them (his standing
            no-captions rule; the drawing shows the two pills alone).
            Both doors wear the drawing's secondary-container dress. */}
        <View style={styles.doorway}>
          <View style={styles.doorBtns}>
            <Pressable
              style={[styles.doorBtn, { backgroundColor: palette.band }]}
              onPress={() => {
                setOpenBubblesKey(null);
                setStories(true);
              }}
            >
              <MaterialIcons name="list" size={18} color={palette.raspDeep} />
              <Text style={[styles.doorBtnText, { color: palette.raspDeep }]}>Read as Stories</Text>
            </Pressable>
            {/* v293: the Devotional door — right beside Stories at the
                chapter's top, and ONLY when the devotional registry
                carries this chapter (purely registry-driven). */}
            {props.onListen && devotional ? (
              <Pressable
                style={[styles.doorBtn, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={props.onListen}
                accessibilityLabel={`Devotional — ${devotional.title}`}
              >
                <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
                <Text style={styles.doorBtnTextLight}>Devotional</Text>
              </Pressable>
            ) : null}
            <Pressable
              style={[styles.doorBtn, { backgroundColor: palette.band }]}
              onPress={() => {
                const y = yByKey.current.get('contents');
                if (y !== undefined) scrollToY(y);
              }}
            >
              <MaterialIcons name="menu-book" size={18} color={palette.raspDeep} />
              <Text style={[styles.doorBtnText, { color: palette.raspDeep }]}>Contents</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Previously ── */}
        {!readOnly && chapterData?.previously?.length ? (
          <View style={styles.block}>
            <Text style={[styles.label, { color: palette.inkFaint }]}>Previously</Text>
            {chapterData.previously.map((p, i) => (
              <Text key={i} style={[styles.bodyPara, { color: palette.ink }]}>{p}</Text>
            ))}
          </View>
        ) : null}

        {/* ── Chapter opener (v311: the drawing's opener — his face
            and name, the plain CHAPTER OPENER word at the right, no
            badge chip, no drop cap; his words flow full width) ── */}
        {!readOnly && chapterData?.intro.length ? (
          <View style={styles.block}>
            <View style={styles.openerHead}>
              <AuthorFace author={resolveBubbleAuthor(null, people, profile)} size={30} palette={palette} />
              <Text style={[styles.openerName, { color: palette.ink }]} numberOfLines={1}>
                {resolveBubbleAuthor(null, people, profile).name}
              </Text>
              <Text style={[styles.openerTag, { color: palette.inkSoft }]}>Chapter opener</Text>
            </View>
            {chapterData.intro.map((b, i) =>
              b.kind === 'para' ? (
                <Text key={i} style={[styles.openerPara, { color: palette.ink }]}>{b.text}</Text>
              ) : (
                <BlockView key={i} block={b} palette={palette} />
              ),
            )}
          </View>
        ) : null}

        {/* ── Outline (his recorded chapter outline, where the source has one) ── */}
        {!readOnly && chapterData?.outline.length ? (
          <View style={styles.block}>
            <Text style={[styles.label, { color: palette.inkFaint }]}>Outline</Text>
            {chapterData.outline.map((o, i) => {
              const startNum = parseInt(o.range.match(/\d+/)?.[0] ?? '', 10);
              return (
                <Pressable
                  key={i}
                  style={styles.tocRow}
                  onPress={() => {
                    if (!Number.isNaN(startNum)) landOnVerse(startNum);
                  }}
                >
                  <Text style={[styles.tocNum, { color: palette.rasp }]}>{i + 1}</Text>
                  <Text style={[styles.tocTitle, { color: palette.ink }]}>{o.title}</Text>
                  <View style={[styles.leader, { borderBottomColor: palette.lineDark }]} />
                  <Text style={[styles.tocRange, { color: palette.inkSoft }]}>{o.range}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {/* ── Contents ── */}
        {!readOnly ? (
        <View
          style={styles.block}
          onLayout={(e) => yByKey.current.set('contents', e.nativeEvent.layout.y)}
        >
          <View style={styles.contentsHead}>
            <Text style={[styles.label, { color: palette.inkFaint }]}>Contents</Text>
            <Text style={[styles.tocNote, { color: palette.inkFaint }]}>Tap a line to jump ↓</Text>
          </View>
          {sections.map((s, i) => (
            <Pressable
              key={s.start}
              style={styles.tocRow}
              onPress={() => {
                const y = yByKey.current.get(`secwrap-${s.start}`);
                if (y !== undefined) scrollToY(y);
              }}
            >
              <Text style={[styles.tocNum, { color: palette.rasp }]}>{i + 1}</Text>
              <Text style={[styles.tocTitle, { color: palette.ink }]}>{s.title ?? rangeLabel(s.start, s.end)}</Text>
              <View style={[styles.leader, { borderBottomColor: palette.lineDark }]} />
              <Text style={[styles.tocRange, { color: palette.inkSoft }]}>{rangeLabel(s.start, s.end)}</Text>
            </Pressable>
          ))}
        </View>
        ) : null}

        {/* ── Sections + entries ── */}
        {sections.map((section, sIdx) => {
          // v250: every section is a tonal CARD in its own derived
          // hue — the family cycles by section index, and the tone
          // rides into the band and every entry inside it.
          const tone = sectionToneFor(palette, sIdx);
          return (
          <View
            key={section.start}
            style={[
              styles.sectionCard,
              readOnly
                ? { backgroundColor: palette.paper2, borderWidth: 1, borderColor: palette.line }
                : { backgroundColor: tone.bg },
            ]}
            onLayout={(e) => yByKey.current.set(`secwrap-${section.start}`, e.nativeEvent.layout.y)}
          >
            <SectionBand start={section.start} end={section.end} title={section.title} palette={palette} tone={tone} />
            {section.entries.map((entry) => {
              // v214: the bubble piece riding on this rendered entry —
              // in With-notes the entry IS the piece; in Read-only the
              // piece whose span starts at this verse anchors here.
              const piece = readOnly
                ? bubbleByStart.get(entry.start)
                : bubblePieces.get(entryKey(book, chapter, entry.start, entry.end));
              const pieceKey = piece ? entryKey(book, chapter, piece.start, piece.end) : null;
              const entryY = yByKey.current.get(entryKey(book, chapter, entry.start, entry.end));
              return (
              <EntryView
                key={entry.start}
                entry={entry}
                book={book}
                chapter={chapter}
                verseText={verseText}
                marksEntry={marksFor(displayMarks, book, chapter, entry.start, entry.end)}
                entryTint={resolveTintFields(displayMarks, book, chapter, entry.start, entry.end).tint}
                verseTints={resolveTintFields(displayMarks, book, chapter, entry.start, entry.end).verseTints}
                phraseHighlights={resolvePhraseHighlights(displayMarks, book, chapter, entry.start, entry.end)}
                marksMap={marks}
                kept={entryStatus.get(entryKey(book, chapter, entry.start, entry.end))?.kept ?? false}
                open={isOpen(entry)}
                flash={flashKey === entryKey(book, chapter, entry.start, entry.end)}
                flashAnim={flashAnim}
                palette={palette}
                tone={tone}
                bubblePiece={piece}
                people={people}
                profile={profile}
                bubbleOpen={pieceKey !== null && openBubblesKey === pieceKey}
                bloom={bloom}
                viewportHeight={viewHeight.current > 0 ? viewHeight.current : Dimensions.get('window').height}
                topChrome={headerH}
                bottomReserve={112}
                entryScreenTop={entryY !== undefined ? entryY - scrollYRef.current : null}
                onBubbleToggle={(next) => setOpenBubblesKey(next && pieceKey ? pieceKey : null)}
                onToggleOpen={() => toggleOpen(entry)}
                onToggleKept={() => handleToggleKept(entry.start, entry.end, entry.blocks.some((b) => b.kind === 'highlight'))}
                onAddLine={(kind, text, author) => handleAddLine(entry.start, entry.end, kind, text, author)}
                onUpdateLine={handleUpdateLine}
                onRemoveLine={handleRemoveLine}
                onPhraseTint={(verse, range, tint) => handlePhraseTint(entry.start, entry.end, verse, range, tint)}
                onLinePhraseTint={handleLinePhraseTint}
                onSelectionDragChange={setSelectionDrag}
                onClusterExtent={(bottom) => {
                  // v361: the seat check's raw material — this
                  // entry's standing cluster bottom (within-entry
                  // coordinates), or null when it folds away.
                  const key = entryKey(book, chapter, entry.start, entry.end);
                  if (bottom === null) seatExtentsRef.current.delete(key);
                  else seatExtentsRef.current.set(key, bottom);
                  ensureSeatVisible();
                }}
                registerY={(y) =>
                  yByKey.current.set(
                    entryKey(book, chapter, entry.start, entry.end),
                    (yByKey.current.get(`secwrap-${section.start}`) ?? 0) + y,
                  )
                }
                topAuthorIds={topAuthorIds}
                onVerseSeatOpen={(yWithinEntry) => {
                  // v356: a verse's composer just seated beneath it —
                  // land the verse on screen ONLY when verse + box
                  // would not already be visible together: the verse
                  // tucked under the header, or too little room left
                  // beneath it for the unfurling cluster. A verse
                  // already sitting comfortably never yanks the page.
                  const key = entryKey(book, chapter, entry.start, entry.end);
                  const entryY = yByKey.current.get(key);
                  if (entryY === undefined) return;
                  const verseTop = entryY + yWithinEntry;
                  const screenTop = verseTop - scrollYRef.current;
                  const vh = viewHeight.current > 0 ? viewHeight.current : Dimensions.get('window').height;
                  if (
                    screenTop < headerHRef.current + CHAPTER_HEADER_LAND_GAP ||
                    screenTop > vh - VERSE_COMPOSER_ROOM_PX
                  ) {
                    scrollToY(verseTop);
                  }
                }}
              />
              );
            })}
          </View>
          );
        })}

        {!versesLoaded ? (
          <Text style={[styles.loading, { color: palette.inkSoft }]}>Loading the chapter…</Text>
        ) : null}

        <Text style={[styles.footNote, { color: palette.inkFaint }]}>
          {chapter >= totalChapters
            ? `End of ${book} — the index and search work on every chapter.`
            : `End of ${book} ${chapter} — the next chapter's outline sits at the top of its own page.`}
        </Text>

        {/* v228 — the foot carries the READ mark only (his ruling:
            the reader is for reading; the v222 complete-button that
            stood here is gone, with every other notes-state control
            on this surface — the notes-written state is set from the
            book grid's editor and the studio). Unread shows the
            button; read shows its date with an undo, mirroring the
            old line's honesty pattern. */}
        {studyState !== null && readDate === null ? (
          <Pressable
            style={[styles.markReadBtn, { backgroundColor: palette.readPill }, palette.btnDress]}
            accessibilityLabel={`Mark ${book} ${chapter} as read`}
            onPress={handleMarkRead}
          >
            <Text style={[styles.markReadText, { color: palette.readPillInk }]}>Mark as Read</Text>
            {/* v250: the mockup's gold chip — the reward made visible
                on the button that earns it (+25 XP is the reader's
                real reward for a chapter read, rewards.ts). */}
            <View style={[styles.xpChip, { backgroundColor: palette.xpGold }]}>
              <Text style={[styles.xpChipText, { color: palette.xpGoldInk }]}>+25 XP</Text>
            </View>
          </Pressable>
        ) : null}
        {studyState !== null && readDate !== null ? (
          <View style={styles.footRead}>
            {/* v313: the done state is the drawing's foot pill —
                secondary-container dress, bookmark + "Read · {date}"
                as one quiet confirmation, clear kept beneath it. */}
            <View style={[styles.footReadPill, { backgroundColor: palette.band }]}>
              <MaterialIcons name="bookmark" size={16} color={palette.raspDeep} />
              <Text style={[styles.footReadLine, { color: palette.raspDeep }]}>Read · {formatReadDate(readDate)}</Text>
            </View>
            <Pressable onPress={handleClearRead} hitSlop={8} accessibilityLabel={`Clear the read mark for ${book} ${chapter}`}>
              <Text style={[styles.footReadSub, { color: palette.inkFaint, textDecorationLine: 'underline' }]}>
                Clear the read mark
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.chapterNav}>
          <Pressable
            style={[styles.navBtn, { borderColor: palette.lineDark, backgroundColor: palette.paper2 }, palette.btnDress, chapter <= 1 ? styles.navOff : null]}
            disabled={chapter <= 1}
            onPress={() => props.onNavigateChapter(chapter - 1)}
          >
            <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13.5 }}>‹ {chapterLabel(chapter - 1)}</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, { borderColor: palette.lineDark, backgroundColor: palette.paper2 }, palette.btnDress, chapter >= totalChapters ? styles.navOff : null]}
            disabled={chapter >= totalChapters}
            onPress={() => props.onNavigateChapter(chapter + 1)}
          >
            <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13.5 }}>{chapterLabel(chapter + 1)} ›</Text>
          </Pressable>
        </View>
        {/* v259: the foot clears the tab bar riding over the
            reader (its occupied height + breathing room), never
            less than the old FAB-clearing 96. v361: while a
            composer's seat needs more room than the chapter's own
            scroll range has, the spacer grows to lend it (the seat
            check above spends it) and shrinks back on close. */}
        <View style={{ height: Math.max(96, (props.tabBarHeight ?? 0) + 24, seatSpacer) }} />
      </ScrollView>

      {/* ── v342: NO top fade on the reader — the fade belongs
          on main tab screens and headerless scrollers only (his
          Oct 29 scope ruling); the chapter page has a definite
          header, so the topwrap's solid paper fill (removed in
          v334 for the fade) is restored above: the header stands
          solid and the verses end at its edge, as they did
          before v334. ── */}

      {/* ── Verses FAB ── */}
      {!sheet ? (
        <Pressable style={[styles.fab, { backgroundColor: palette.primCont, shadowColor: palette.rasp, bottom: 24 + (props.tabBarHeight ?? 0) }]} onPress={() => setSheet('verses')}>
          <MaterialIcons name="grid-view" size={16} color={palette.raspDeep} />
          <Text style={[styles.fabText, { color: palette.raspDeep }]}>Verses</Text>
        </Pressable>
      ) : null}

      <IndexSheet
        visible={sheet !== null}
        focusSearch={sheet === 'search'}
        book={book}
        chapter={chapter}
        sections={sections}
        verses={verses}
        entryStatus={entryStatus}
        userCategories={userCategories}
        palette={palette}
        onClose={() => setSheet(null)}
        onLand={landOnVerse}
      />

    </View>
  );

  // v246: screenRoot — a whole screen's paint is never gated on
  // the settle's fade (see components/paper-motion.tsx).
  if (skin === 'paper') return <PaperSettle screenRoot>{content}</PaperSettle>;
  if (skin === '8bit') return <BitSettle screenRoot>{content}</BitSettle>;
  return content;
}


// ─── One verse entry: toggle + his blocks + the markup bar ──────────────────

/** v356: the unfurl's duration — the verse-seated composer grows
 * out of its verse and collapses back into it on this one timing. */
export const VERSE_COMPOSER_UNFURL_MS = 280;

/** v356: the room a verse-open wants beneath the verse before the
 * page bothers to scroll — roughly the unfurled cluster's height,
 * so verse and box are visible together. */
export const VERSE_COMPOSER_ROOM_PX = 360;

/** v361: the band at the foot of the viewport a standing composer's
 * action row must clear — the floating Verses pill rides 24px above
 * the tab bar at ~40px tall; this is its seat plus working room, so
 * Cancel and Save land fully visible and tappable above it. */
export const SEAT_FAB_CLEARANCE_PX = 76;

/**
 * v356 — the unfurl itself (his ruling, 2026-10-29 22:55: "I want
 * the text box to unfurl from the verse I tap"). The verse-seated
 * mark cluster grows downward out of the tapped verse's bottom
 * edge — animated height + opacity, the growth's origin at its
 * top — and collapses back into the verse on close, calling
 * onExited when it has fully folded so the owner can clear the
 * composer. JS-DRIVEN by house rule (useNativeDriver: false —
 * height is a layout property, and nothing on this path rides the
 * native animated graph), VERSE_COMPOSER_UNFURL_MS on a gentle
 * ease-out cubic; no bounce, no spring. Under the OS
 * reduce-motion setting it opens and closes instantly, the same
 * discipline as the chapter progress thread (v304). The content
 * rides absolutely inside the growing frame and reports its
 * natural height through onLayout (the collapsible pattern), so
 * the frame's height is the only layout the animation drives.
 */
function VerseUnfurl(props: {
  closing: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  const grow = useRef(new Animated.Value(0)).current;
  const growValueRef = useRef(0);
  const [naturalH, setNaturalH] = useState(0);
  const [reduced, setReduced] = useState<boolean | null>(null);
  const exitedRef = useRef(false);
  const liveRef = useRef(true);
  const onExitedRef = useRef(props.onExited);
  onExitedRef.current = props.onExited;
  useEffect(() => {
    liveRef.current = true;
    const sub = grow.addListener(({ value }) => {
      growValueRef.current = value;
    });
    return () => {
      liveRef.current = false;
      grow.removeListener(sub);
    };
  }, [grow]);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (live) setReduced(r);
      })
      .catch(() => {
        if (live) setReduced(false);
      });
    return () => {
      live = false;
    };
  }, []);
  // Settle open: on mount (grow starts folded), and again if a
  // collapse was interrupted by re-tapping the same verse — grow
  // back out from wherever the fold had reached.
  useEffect(() => {
    if (props.closing || reduced === null || naturalH <= 0) return;
    if (reduced) {
      grow.setValue(1);
      return;
    }
    if (growValueRef.current >= 1) return;
    const anim = Animated.timing(grow, {
      toValue: 1,
      duration: VERSE_COMPOSER_UNFURL_MS,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: false,
    });
    anim.start();
    return () => anim.stop();
  }, [props.closing, reduced, naturalH, grow]);
  // The collapse: fold back into the verse, then hand back so the
  // owner clears the composer. Instant under reduce-motion.
  useEffect(() => {
    if (!props.closing || exitedRef.current || reduced === null) return;
    const finish = () => {
      if (exitedRef.current || !liveRef.current) return;
      exitedRef.current = true;
      onExitedRef.current();
    };
    if (reduced) {
      grow.setValue(0);
      finish();
      return;
    }
    const anim = Animated.timing(grow, {
      toValue: 0,
      duration: VERSE_COMPOSER_UNFURL_MS,
      easing: RNEasing.out(RNEasing.cubic),
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      if (finished) finish();
    });
    return () => anim.stop();
  }, [props.closing, reduced, grow]);
  return (
    <Animated.View
      style={{
        height: naturalH > 0 ? grow.interpolate({ inputRange: [0, 1], outputRange: [0, naturalH] }) : 0,
        opacity: grow,
        overflow: 'hidden',
      }}
    >
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - naturalH) > 0.5) setNaturalH(h);
        }}
      >
        {props.children}
      </View>
    </Animated.View>
  );
}

function EntryView(props: {
  entry: V205Entry;
  book: string;
  chapter: number;
  verseText: Map<number, string>;
  marksEntry: EntryMarks;
  /** v212: the entry tint + per-verse tints as this entry should show
   * them (resolved by the page: split-piece partitions in With-notes,
   * covering grouped records in Read-only). */
  entryTint: TintColor | null;
  verseTints: Record<number, TintColor>;
  /** v361: this span's drag-selected phrase ranges on the verses,
   * resolved by the page like the tint fields above them. */
  phraseHighlights: VersePhraseHighlight[];
  /** v361: the RAW marks map — his lines' phrase ranges are looked
   * up through their storage targets (lineHighlightsFor), which
   * only the raw map can answer. */
  marksMap: MarksMap;
  kept: boolean;
  open: boolean;
  flash: boolean;
  flashAnim: Animated.Value;
  palette: BiblePalette;
  /** v250: the tone of the section card this entry sits in — its
   * numerals wear the tone's deep shade. */
  tone: BibleSectionTone;
  /** v214/v217: the line piece riding on this entry, partitioned by
   * authorship (undefined = the entry carries no user lines). */
  bubblePiece?: BubblePiece;
  people: Person[];
  profile: ProfileIdentity;
  bubbleOpen: boolean;
  bloom: BloomTiming;
  viewportHeight: number;
  topChrome: number;
  bottomReserve: number;
  entryScreenTop: number | null;
  onBubbleToggle: (open: boolean) => void;
  onToggleOpen: () => void;
  onToggleKept: () => void;
  onAddLine: (kind: 'highlight' | 'thought' | 'note', text: string, author: LineAuthor | null) => void;
  onUpdateLine: (target: LineStorageTarget, patch: { text?: string; author?: LineAuthor | null }) => void;
  onRemoveLine: (target: LineStorageTarget) => void;
  /** v361: a tint picked from a verse selection bar. */
  onPhraseTint: (verse: number, range: { start: number; end: number }, tint: TintColor) => void;
  /** v361: a tint picked from the selection bar inside his line. */
  onLinePhraseTint: (target: LineStorageTarget, range: { start: number; end: number }, tint: TintColor) => void;
  /** v361: a drag-selection started/ended — the page locks scroll. */
  onSelectionDragChange?: (active: boolean) => void;
  /** v361: the standing mark cluster's bottom edge within this
   * entry (the page's seat check keeps the composer's action row
   * clear of the Verses pill); null when no cluster stands. */
  onClusterExtent?: (bottomWithinEntry: number | null) => void;
  registerY: (y: number) => void;
  /** v356: a verse's selection action seated its composer —
   * the verse's top within this entry, so the page can land the
   * verse (with room beneath it for the unfurling box) on screen. */
  onVerseSeatOpen?: (yWithinEntry: number) => void;
  /** v356: the composer's Top 5 — people most often credited on
   * his stored notes (rankedAuthorIds over the whole marks map). */
  topAuthorIds?: string[];
}) {
  const { entry, palette } = props;
  const [composer, setComposer] = useState<null | 'highlight' | 'thought' | 'note'>(null);
  const [draft, setDraft] = useState('');
  // v214: the composer's "Who said this?" pick (null = Me) and, when
  // the composer was opened from an open bubble's pencil, the storage
  // target of the line being edited.
  const [composerAuthor, setComposerAuthor] = useState<LineAuthor | null>(null);
  const [editingTarget, setEditingTarget] = useState<LineStorageTarget | null>(null);
  // v356: the verse seat. A composer opened by a verse selection
  // action is homed on that verse (its number rides here) and the
  // whole mark cluster — markbar, category chips, the note box —
  // renders directly beneath THAT verse in the head's verse flow,
  // unfurling out of it (VerseUnfurl below), instead of sitting at
  // the entry body's tail verses away (his Leviticus 26 report:
  // he tapped verse 2, the box opened below verse 3). null = the
  // body seat, exactly where the cluster has always lived. While a
  // verse-seated close is collapsing back into its verse,
  // composerClosing rides true and the clear is deferred to the
  // unfurl's exit (finishCloseComposer).
  const [composerVerse, setComposerVerse] = useState<number | null>(null);
  const [composerClosing, setComposerClosing] = useState(false);
  const closingRef = useRef(false);
  // v357: whether a verse seat is what OPENED this entry. Entries
  // group verses (a bare chapter chunks three to an entry), so a
  // verse-seated composer force-opens the entry and its body —
  // placeholder, markbar, chips — renders at the entry's tail,
  // below verse 3. v356 cleared only the composer on close,
  // leaving that expanded body standing under the wrong verse
  // (his Leviticus 26 report: he opened verse 1, backed out, and
  // verse 3 wore the seat). finishCloseComposer now folds the
  // entry back whenever THIS verse seat opened it, so a close by
  // any path — Cancel, Save, Android back — leaves the page
  // exactly as the selection action found it. v367: that seat is
  // reached from the selection bar, never from a plain verse tap.
  const openedEntryForVerseRef = useRef(false);
  // v356: the latest closeComposer, for the back handler below
  // (assigned every render, so the handler never closes stale).
  const composerCloseRef = useRef<() => void>(() => {});
  // v356: each verse block's top within the entry (onLayout-cached:
  // the verse's y inside entryVerses, plus the entryVerses box's own
  // y inside the head), so a verse-open can ask the page to land the
  // verse — with room beneath it for the box — on screen.
  const verseYRef = useRef(new Map<number, number>());
  const versesBoxYRef = useRef(0);
  // v361: this entry's root and its standing mark cluster, for the
  // seat report — the cluster's bottom edge measured against the
  // entry root (measureLayout), handed to the page's seat check so
  // the unfurled composer's Cancel/Save row never again lands
  // under the floating Verses pill (his 2026-10-30 screenshot).
  const entryRootRef = useRef<View | null>(null);
  const clusterRef = useRef<View | null>(null);
  const reportClusterExtent = () => {
    // Only a standing COMPOSER needs the seat kept clear — the
    // bare markbar is short and rides anywhere (reporting it would
    // scroll the page merely for opening an entry near the foot).
    if (!composer) {
      props.onClusterExtent?.(null);
      return;
    }
    const root = entryRootRef.current as unknown as View | null;
    const cluster = clusterRef.current;
    if (!root || !cluster || !props.onClusterExtent) return;
    cluster.measureLayout(
      root,
      (_x, y, _w, h) => props.onClusterExtent?.(y + h),
      () => {},
    );
  };
  // v361: when the composer folds away entirely, the seat report
  // clears — nothing stands, nothing to keep clear of the pill.
  useEffect(() => {
    if (!composer) props.onClusterExtent?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [composer]);
  // v361: whether this composer was opened by the selection bar's
  // Bubble action — it is framed as what it is ("Someone said"),
  // and saving it credited to another person is what births the
  // bubble at the verse's dock, exactly as bubbles are born today.
  const [composerBubble, setComposerBubble] = useState(false);
  const openComposer = (kind: 'highlight' | 'thought' | 'note') => {
    setComposer(kind);
    setDraft('');
    setComposerAuthor(null);
    setEditingTarget(null);
    setComposerBubble(false);
  };
  // v352: the selection bar's Note/Bubble actions open the note
  // composer homed on that verse — the body opens first if it was
  // closed, and the draft carries the '#<verse>' prefix of his
  // own notation (parseHashVerseRef / splitEntryByHashNotes: the
  // saved line renders riding exactly that verse, write-back
  // origins included). v367: a plain tap on the verse text no
  // longer reaches this path; only a long-press selection does.
  const openComposerForVerse = (verse: number, opts?: { bubble?: boolean }) => {
    // v357: a FRESH verse seat records whether it is the action
    // that opens the entry (a retarget rides the seat already open
    // and keeps the first action's record).
    if (composerVerse === null) openedEntryForVerseRef.current = !props.open;
    if (!props.open) props.onToggleOpen();
    setComposer('note');
    setDraft(`#${verse} `);
    setComposerAuthor(null);
    setEditingTarget(null);
    // v361: the selection bar's Bubble action seats this same
    // composer — framed "Someone said", since crediting another
    // person in the picker below IS the bubble flow (v214: there
    // is no separate bubble composer; authorship decides where a
    // saved line renders, and a bubble renders at the verse dock).
    setComposerBubble(!!opts?.bubble);
    // v356: home the composer on this verse — the cluster unfurls
    // directly beneath it in the verse flow (see the verse map),
    // retargeting cleanly if another verse's box was open or still
    // collapsing. And ask the page to land the verse on screen
    // with room beneath it, so verse and box stay visible together.
    closingRef.current = false;
    setComposerClosing(false);
    setComposerVerse(verse);
    props.onVerseSeatOpen?.(versesBoxYRef.current + (verseYRef.current.get(verse) ?? 0));
  };
  const finishCloseComposer = () => {
    closingRef.current = false;
    setComposerClosing(false);
    setComposerVerse(null);
    setComposer(null);
    setEditingTarget(null);
    setComposerAuthor(null);
    setComposerBubble(false);
    // v357: the seat is fully cleared — and an entry this verse
    // tap opened folds back with it, so no expanded markbar is
    // left standing at the entry's tail under another verse.
    // (His own saved lines render whether the entry is open or
    // closed, so a Save loses nothing by folding.)
    if (openedEntryForVerseRef.current) {
      openedEntryForVerseRef.current = false;
      if (props.open) props.onToggleOpen();
    }
  };
  const closeComposer = () => {
    // v356: a verse-seated composer collapses back into its verse
    // first — VerseUnfurl runs the collapse and calls
    // handleUnfurlExited, which lands here as finishCloseComposer.
    // A body-seated composer closes as it always has, at once.
    if (composerVerse !== null) {
      closingRef.current = true;
      setComposerClosing(true);
      return;
    }
    finishCloseComposer();
  };
  const handleUnfurlExited = () => {
    // A retarget mid-collapse clears closingRef first, so a late
    // exit from the old verse's unfurl lands as a no-op.
    if (!closingRef.current) return;
    finishCloseComposer();
  };
  composerCloseRef.current = closeComposer;
  // v356 (his ruling, 2026-10-29 23:09): while THIS entry's
  // composer is open, the Android back gesture/button folds the
  // composer shut — through closeComposer itself, so back does
  // exactly what Cancel does (same close path, same draft fate,
  // verse-seat collapse included) — instead of stranding the box
  // open until he leaves the chapter. Registered only while a
  // composer is open; with none open, back is the page's own
  // business and behaves exactly as it always has. (The prayer
  // session's deliberate back-block is a different surface and is
  // not touched.)
  const composerOpen = composer !== null;
  useEffect(() => {
    if (!composerOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      composerCloseRef.current();
      return true;
    });
    return () => sub.remove();
  }, [composerOpen]);
  const editBubbleLine = (lineIndex: number) => {
    const piece = props.bubblePiece;
    if (!piece) return;
    const line = piece.lines[lineIndex];
    const target = piece.targets[lineIndex];
    if (!line || !target) return;
    // v244: studio quote lines are edited in the studio, never here
    // (their card shows no pencil either — this is the belt to its
    // braces, and it keeps the sentinel target away from the marks).
    if (line.source === 'quote' || line.kind === 'quote') return;
    // v356: line edits keep the body seat they have always had —
    // a verse seat never carries an edit.
    closingRef.current = false;
    setComposerClosing(false);
    setComposerVerse(null);
    openedEntryForVerseRef.current = false;
    setComposerBubble(false);
    setComposer(line.kind);
    setDraft(line.text);
    setComposerAuthor(line.author);
    setEditingTarget(target);
    props.onBubbleToggle(false);
    if (!props.open) props.onToggleOpen();
  };
  // v217: tapping one of his in-flow lines opens the SAME composer,
  // prefilled with its words and its face pick — saving an edit, a
  // re-face (to someone else it becomes a bubble; a bubble line
  // re-faced to Me lands here), or the composer's Delete all write
  // through the line's storage target, '#' provenance included.
  const editSelfLine = (lineIndex: number) => {
    const piece = props.bubblePiece;
    if (!piece) return;
    const line = piece.selfLines[lineIndex];
    const target = piece.selfTargets[lineIndex];
    if (!line || !target) return;
    // Self lines are marks lines by construction (v217) — a quote
    // kind can never land here; the check is the type's seatbelt.
    if (line.kind === 'quote') return;
    // v356: line edits keep the body seat they have always had —
    // a verse seat never carries an edit.
    closingRef.current = false;
    setComposerClosing(false);
    setComposerVerse(null);
    openedEntryForVerseRef.current = false;
    setComposerBubble(false);
    setComposer(line.kind);
    setDraft(line.text);
    setComposerAuthor(line.author);
    setEditingTarget(target);
    props.onBubbleToggle(false);
    if (!props.open) props.onToggleOpen();
  };
  const deleteEditingLine = () => {
    if (!editingTarget) return;
    props.onRemoveLine(editingTarget);
    props.onBubbleToggle(false);
    closeComposer();
  };
  const removeBubbleLine = (lineIndex: number) => {
    const piece = props.bubblePiece;
    if (!piece) return;
    // v244: a studio quote is never removed from the reading surface.
    if (piece.lines[lineIndex]?.source === 'quote') return;
    const target = piece.targets[lineIndex];
    if (!target) return;
    props.onRemoveLine(target);
    if (piece.lines.length <= 1) props.onBubbleToggle(false);
  };
  // v212: the entry tint washes the whole entry container — head and
  // body, open or closed. (The jump-flash still wins while it runs.)
  const wash = tintWashFor(palette, props.entryTint);
  // v250: the flash is the seed's own tint now — the last fixed pink
  // rgba in this file is gone with the fixed palette.
  const flashBg = props.flash
    ? props.flashAnim.interpolate({ inputRange: [0, 1], outputRange: [palette.flashTintClear, palette.flashTint] })
    : (wash ?? 'transparent');

  // v356: the mark cluster — markbar and the composer box when one
  // is open — is ONE unit with ONE seat. Its home seat is the entry
  // body (rendered there below, exactly as it always has been); a
  // verse-opened composer carries the whole cluster up into the
  // verse flow, directly beneath the tapped verse (see the verse
  // map). Never both at once.
  // v361: the cluster is SLIMMED to his approved model — the kind
  // chips, the Main Thought and Highlight buttons, and the tint row
  // are gone from this surface (colour now lives on the selection
  // bar, on the words themselves). Keep and Note remain. Stored
  // typed entries are untouched by the slimming: they keep
  // rendering, editing through this same box (the edit paths set
  // the composer's kind from the line itself), and round-tripping
  // to the Studio exactly as before. The wrapper measures the
  // cluster's bottom edge for the page's seat check (v361 seat fix).
  const renderMarkCluster = () => (
    <View ref={clusterRef} onLayout={reportClusterExtent}>
      <View style={[styles.markbar, { borderTopColor: palette.line }]}>
        <Pressable style={styles.markBtn} onPress={props.onToggleKept}>
          <Text style={{ color: props.kept ? palette.rose : palette.inkSoft, fontSize: 13 }}>♥</Text>
          <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>{props.kept ? 'Kept' : 'Keep'}</Text>
        </Pressable>
        <Pressable style={styles.markBtn} onPress={() => openComposer('note')}>
          <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Note</Text>
        </Pressable>
      </View>

      {composer ? (
        <View style={[styles.composer, { borderColor: palette.bandLine, backgroundColor: palette.paper2 }, palette.cardDress]}>
          <Text style={[styles.composerLabel, { color: composer === 'highlight' ? palette.yellowLabel : palette.greyLabel }]}>
            {editingTarget
              ? `Editing ${kindLabelFor(composer)}`
              : composerBubble
                ? 'Someone said'
                : composer === 'highlight' ? '✦ Your Highlight' : composer === 'note' ? 'Your Note' : 'Main Thought'}
          </Text>
          <TextInput
            style={[styles.composerInput, { color: palette.ink }]}
            placeholder={composer === 'highlight' ? 'The line that stays with you…' : composer === 'note' ? 'A plain note, in your own words…' : 'The one thought to carry…'}
            placeholderTextColor={palette.inkFaint}
            value={draft}
            onChangeText={setDraft}
            multiline
            autoFocus
          />
          <Text style={[styles.composerHint, { color: palette.inkFaint }]}>
            Tip: start a note with #11-12 to set those verses apart with it.
          </Text>
          {/* v214: every line can wear a face — his own by
              default, or anyone from his People when they said
              the thing worth keeping. Re-picking here re-faces
              an existing line just as it faces a new one. */}
          <AuthorPicker
            people={props.people}
            profile={props.profile}
            value={composerAuthor}
            palette={palette}
            onChange={setComposerAuthor}
            topPeopleIds={props.topAuthorIds}
          />
          <View style={styles.composerBtns}>
            {editingTarget ? (
              // v217: a line opened for editing — from a bubble
              // OR from the flow — can be deleted right here.
              <Pressable onPress={deleteEditingLine} style={styles.composerDelete}>
                <Text style={{ color: palette.raspDeep, fontWeight: '700', fontSize: 13 }}>Delete</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={closeComposer}>
              <Text style={{ color: palette.inkSoft, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.addBtn, { backgroundColor: palette.rasp }, palette.btnDress]}
              onPress={() => {
                const text = draft.trim();
                if (text) {
                  if (editingTarget) props.onUpdateLine(editingTarget, { text, author: composerAuthor });
                  else props.onAddLine(composer, text, composerAuthor);
                } else if (editingTarget) {
                  // An author-only change (re-face) still saves
                  // with the text untouched.
                  props.onUpdateLine(editingTarget, { author: composerAuthor });
                }
                closeComposer();
              }}
            >
              <Text style={styles.addBtnText}>{editingTarget ? 'Save' : 'Add'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );

  // v244: the entry head's height — where this entry's verses end.
  // The Living Bubble layer docks its open thread below that line
  // (measured here, where the head actually lays out).
  const [headH, setHeadH] = useState<number | null>(null);

  // v217 (his ruling): authorship splits the rendering. HIS OWN
  // lines render in this flow, directly under the entry's verses —
  // always visible, in both modes; OTHER PEOPLE's lines live in the
  // margin as Living Bubbles (below). The body keeps the commentary
  // blocks only; imported blocks are untouched.
  // v244: a studio quote block carrying a speaker id is NOT rendered
  // as a block any more — it lives in the margin as that person's
  // face bubble (buildBubblePieces picks it up from the same entry).
  // A name-only quote keeps its ❝ callout here, untouched.
  const blocks = entry.blocks.filter((b) => !(b.kind === 'quote' && b.authorId));
  const selfLines = props.bubblePiece?.selfLines ?? [];
  // `lines` on the piece is other people's lines only (v217), so an
  // entry carrying solely his own words gets NO bubble inset.
  const hasBubbles = !!props.bubblePiece && props.bubblePiece.lines.length > 0;

  return (
    <Animated.View
      ref={entryRootRef as never}
      style={[styles.entry, { backgroundColor: flashBg }, props.bubbleOpen ? styles.entryOpen : null]}
      onLayout={(e) => props.registerY(e.nativeEvent.layout.y)}
    >
      <View
        style={[styles.entryHead, hasBubbles ? styles.entryHeadBubbled : null]}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeadH((prev) => (prev !== null && Math.abs(prev - h) < 1 ? prev : h));
        }}
      >
        <View style={styles.heartSlot}>
          {props.kept ? <Text style={{ color: palette.rose, fontSize: 14 }}>♥</Text> : null}
        </View>
        <View
          style={styles.entryVerses}
          onLayout={(e) => {
            versesBoxYRef.current = e.nativeEvent.layout.y;
          }}
        >
          {Array.from({ length: entry.end - entry.start + 1 }, (_, i) => entry.start + i).map((v) => {
            const verseBg = verseTintFor(palette, props.verseTints[v]);
            const verseStr = props.verseText.get(v) ?? '';
            // v352: each verse is its own block (the entryVerses gap
            // separates the blocks). v367: a plain tap on the verse
            // TEXT is inert; the selection bar's actions are what
            // open the note composer homed on that verse
            // (openComposerForVerse).
            // v356: the verse block also caches its top inside
            // entryVerses (onLayout), for the verse-open scroll.
            // v361: the verse's words render through SelectableText —
            // a long-press starts a drag-selection on the words and
            // the bar offers the six tints, Bubble, Note; stored
            // phrase ranges wash their words; the LEGACY whole-verse
            // tint still paints behind the whole verse exactly as
            // before (wholeTint), so no tint he already has is lost.
            // The verse number leads as a plain superscript token:
            // its v212 tint-selection tap is retired — selection is
            // the drag now. A verse with no text loaded yet keeps
            // the plain rendering.
            const verseBlock = (
              <View
                key={v}
                style={styles.verseBlock}
                onLayout={(e) => verseYRef.current.set(v, e.nativeEvent.layout.y)}
              >
                {verseStr ? (
                  <SelectableText
                    text={verseStr}
                    palette={palette}
                    textStyle={[styles.entryVerse, { color: palette.ink }]}
                    wholeTint={verseBg}
                    highlights={props.phraseHighlights.filter((h) => h.verse === v)}
                    lead={
                      <View style={styles.supSeat}>
                        <Text style={[styles.supTap, { color: props.tone.deep }]}>{v}</Text>
                      </View>
                    }
                    tapInert
                    onApplyTint={(range, tint) => props.onPhraseTint(v, range, tint)}
                    onBubble={() => openComposerForVerse(v, { bubble: true })}
                    onNote={() => openComposerForVerse(v)}
                    onDragChange={props.onSelectionDragChange}
                  />
                ) : (
                  <Text
                    style={[
                      styles.entryVerse,
                      { flex: 1, color: palette.ink },
                      verseBg ? { backgroundColor: verseBg } : null,
                    ]}
                  >
                    <Text style={[styles.supTap, { color: props.tone.deep }]}>
                      {v}{' '}
                    </Text>
                    {verseStr}
                  </Text>
                )}
                {/* v357: EVERY verse row carries its own expand
                    chevron — one per verse. v367: it is now the
                    ONLY tap door for opening or folding this
                    entry's notes body. */}
                <Pressable onPress={props.onToggleOpen} hitSlop={6} style={{ marginTop: 3 }}>
                  <MaterialIcons
                    name={props.open ? 'expand-less' : 'expand-more'}
                    size={19}
                    color={palette.inkFaint}
                  />
                </Pressable>
              </View>
            );
            // v356: the verse seat. When this verse holds the
            // composer, the whole mark cluster renders DIRECTLY
            // BENEATH it, here in the verse flow — VerseUnfurl
            // grows it out of the verse's bottom edge and folds
            // it back on close. The seat's wrapper claims the
            // responder for its dead space so taps inside the box
            // stay local to the composer (its buttons and input
            // claim their own, like the verse blocks above them).
            const seat =
              composerVerse === v ? (
                <View key={`verse-composer-${v}`} onStartShouldSetResponder={() => true}>
                  <VerseUnfurl closing={composerClosing} onExited={handleUnfurlExited}>
                    {renderMarkCluster()}
                  </VerseUnfurl>
                </View>
              ) : null;
            return [verseBlock, seat];
          })}
        </View>
      </View>

      {/* v217: HIS OWN lines, in the flow directly under the verses
          — rendered whether the entry body is open or closed, in
          With-notes and Read-only alike (his words are part of the
          text). A tap opens his composer on that line. */}
      {selfLines.length ? (
        <View style={styles.selfLines}>
          {selfLines.map((line, i) => {
            // Self lines are marks lines by construction (v217) —
            // a quote kind can never land in this group.
            if (line.kind === 'quote') return null;
            const piece = props.bubblePiece;
            const target = piece?.selfTargets[i];
            // v361: the line's parent verse — its own '#ref' head
            // when it carries one, else the piece's first verse.
            // The selection bar inside the note acts HERE (his
            // ruling: bubbles dock on verses, never in notes; the
            // Note action opens this verse's composer).
            const anchorVerse = parseHashVerseRef(line.text)?.start ?? piece?.start ?? entry.start;
            return (
              <Pressable
                key={`${line.kind}-${line.fieldIndex}-${i}`}
                onPress={() => {
                  // v378: a tap on the line while a selection
                  // stands anywhere is an outside tap — it
                  // clears the selection and does NOT open his
                  // editor. With nothing standing, the tap is
                  // the edit door it has always been.
                  if (hasActiveSelection()) {
                    clearActiveSelection();
                    return;
                  }
                  editSelfLine(i);
                }}
                hitSlop={4}
              >
                <SelfLineBlock
                  kind={line.kind}
                  text={line.text}
                  palette={palette}
                  authorName={resolveBubbleAuthor(line.author, props.people, props.profile).name}
                  face={
                    <AuthorFace
                      author={resolveBubbleAuthor(line.author, props.people, props.profile)}
                      size={34}
                      palette={palette}
                    />
                  }
                  spanText={spanLabelFor(entry.start, entry.end)}
                  onPressText={() => editSelfLine(i)}
                  selection={
                    target
                      ? {
                          highlights: lineHighlightsFor(props.marksMap, props.book, props.chapter, target),
                          onApplyTint: (range, tint) => props.onLinePhraseTint(target, range, tint),
                          onBubble: () => openComposerForVerse(anchorVerse, { bubble: true }),
                          onNote: () => openComposerForVerse(anchorVerse),
                          onDragChange: props.onSelectionDragChange,
                        }
                      : undefined
                  }
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {props.open ? (
        <View style={styles.entryBody}>
          {(() => {
            const cat = props.marksEntry?.category ?? entrySourceCategory(entry.blocks);
            return cat ? (
              <View style={{ marginBottom: 10 }}>
                <CategoryTag category={cat} />
              </View>
            ) : null;
          })()}
          {blocks.length === 0 && !hasBubbles && selfLines.length === 0 ? (
            // v357 (his ruling, 2026-10-30): the old italic
            // no-notes placeholder line is deleted. An expanded
            // verse with no notes gets ONE
            // quiet, tappable invitation in the tonal language —
            // no explanation, just the door — and tapping it opens
            // this entry's note composer, the body's own seat.
            <Pressable
              style={[styles.addNoteRow, { backgroundColor: palette.paper2, borderColor: palette.line }]}
              onPress={() => openComposer('note')}
            >
              <Text style={[styles.addNoteText, { color: palette.inkSoft }]}>+ Add a note</Text>
            </Pressable>
          ) : (
            blocks.map((b, i) => (
              <BlockView key={i} block={b} palette={palette} />
            ))
          )}

          {/* v356: the mark cluster renders here only while no verse
              seat holds it — a verse-opened composer carries the
              cluster up beneath its verse in the head (see the verse
              map + renderMarkCluster). One cluster, one seat. */}
          {composerVerse === null ? renderMarkCluster() : null}
        </View>
      ) : null}

      {/* v214/v217: the Living Bubble layer — OTHER PEOPLE's faces
          in the right margin, blooming over the verses. Rendered in
          both modes and whether the entry body is open or closed. */}
      {hasBubbles && props.bubblePiece ? (
        <LivingBubbles
          piece={props.bubblePiece}
          people={props.people}
          profile={props.profile}
          palette={palette}
          open={props.bubbleOpen}
          bloom={props.bloom}
          versesBottom={headH}
          viewportHeight={props.viewportHeight}
          topChrome={props.topChrome}
          bottomReserve={props.bottomReserve}
          entryScreenTop={props.entryScreenTop}
          onToggle={props.onBubbleToggle}
          onEditLine={editBubbleLine}
          onRemoveLine={removeBubbleLine}
        />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // v251: the header is a measured OVERLAY — absolute over the
  // ScrollView, its height reported through onLayout. elevation
  // lifts it above the scrolled content's own raised cards on
  // Android; zIndex covers iOS.
  topwrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, elevation: 10, borderBottomWidth: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 4 },
  topBtn: { padding: 2 },
  topTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2, flex: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // v313: the drawing's app-bar squares — 40px, radius 12, tonal
  // (colors inline).
  iconBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  keptPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  keptPillText: { fontSize: 12.5, fontWeight: '700' },
  // v304: the card's chrome is gone — the progress is a 4px thread
  // spanning the header's full width at its bottom edge (track and
  // fill colors inline, as the card's were); the shimmer survives.
  progThread: { height: 4, overflow: 'hidden', position: 'relative' },
  progThreadFill: { height: 4 },
  progShimmer: { position: 'absolute', top: 0, bottom: 0, width: '45%', backgroundColor: 'rgba(255,255,255,0.45)' },
  // v304: the slim row the range label and the mode control share —
  // the label left and muted at 11.5, the control right.
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  metaRange: { flex: 1, fontSize: 12, fontWeight: '600' },
  // v313: the drawing's segmented control — an OUTLINE track, the
  // chosen half in secondary-container dress (colors inline).
  modeSeg: { flexDirection: 'row', borderRadius: 999, borderWidth: 1, padding: 3, gap: 2 },
  doorBtnTextLight: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '700' },
  modeBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  modeBtnText: { fontSize: 12.5, fontWeight: '600' },
  page: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 8 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 16, marginTop: 12 },
  // v234: the strip's family lines — a narrow label rail keeps the
  // COMMENTARY and STUDY chips aligned line over line.
  stripMain: { flex: 1, gap: 4 },
  stripLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase', width: 78 },
  stripText: { fontSize: 12.5, lineHeight: 17, flex: 1 },
  stripLink: { fontWeight: '800', fontSize: 12.5 },
  cover: { alignItems: 'center', paddingTop: 34, paddingBottom: 8 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  coverH: { fontSize: 47, fontWeight: '800', letterSpacing: -1.4, marginTop: 10, textAlign: 'center' },
  coverBook: { fontStyle: 'italic', fontSize: 19, marginTop: 8, textAlign: 'center' },
  coverNote: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 16, paddingHorizontal: 12 },
  surfCard: { borderRadius: 28, padding: 16, marginTop: 18 },
  surfHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  surfTitle: { fontSize: 15, fontWeight: '800' },
  surfBody: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  surfBtns: { flexDirection: 'row', gap: 9, marginTop: 12 },
  surfBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  surfBtnPrimary: { borderWidth: 0 },
  surfBtnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  doorway: { alignItems: 'center', marginTop: 14, paddingHorizontal: 6 },
  // v313: the drawing's doors — secondary-container pills at
  // 10/15 padding, 13.5/600 (colors inline).
  doorBtns: { flexDirection: 'row', gap: 9, justifyContent: 'center', flexWrap: 'wrap' },
  doorBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 15 },
  doorBtnText: { fontSize: 13.5, fontWeight: '600' },
  block: { marginTop: 30 },
  label: { fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: '800', marginBottom: 12 },
  bodyPara: { fontSize: 15, lineHeight: 25.5, marginBottom: 12 },
  // v311: the chapter opener's head — face + name, the plain
  // CHAPTER OPENER word right-aligned (text, never a badge chip).
  openerHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  openerName: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  openerTag: { marginLeft: 'auto', fontSize: 11, fontWeight: '700', letterSpacing: 1.6, textTransform: 'uppercase' },
  openerPara: { fontSize: 16, lineHeight: 25, marginBottom: 12 },
  refCallout: { borderLeftWidth: 3, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 15, marginVertical: 12 },
  refQuote: { fontStyle: 'italic', fontSize: 14, lineHeight: 23 },
  contentsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tocNote: { fontSize: 11 },
  tocRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingVertical: 7 },
  tocNum: { fontWeight: '800', fontSize: 12.5, width: 22 },
  tocTitle: { fontWeight: '600', fontSize: 14.5 },
  leader: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', minWidth: 14 },
  tocRange: { fontSize: 11.5 },
  // v311: the section card at the drawing's measure (r16, 18px
  // padding) — tonal in With-notes, plain card in Read-only.
  sectionCard: { borderRadius: 16, paddingTop: 18, paddingHorizontal: 18, paddingBottom: 10, marginTop: 14 },
  entry: { borderRadius: 10 },
  // v214: an entry whose bubbles are open lifts above its neighbours
  // so the bloomed cards paint over the verses below, mockup-style.
  // v217: zIndex only — the v214 elevation: 30 made Android paint a
  // hard-edged shadow silhouette of the whole (transparent) entry,
  // which read on his phone as a white slab behind the open card.
  entryOpen: { zIndex: 30 },
  entryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13, paddingHorizontal: 2 },
  // v214: entries carrying bubbles indent their verses to clear the
  // margin faces (the mockup's 44px entry inset). v244: the faces
  // grew to 51, so the inset grows with them.
  entryHeadBubbled: { paddingRight: 66 },
  heartSlot: { width: 20, alignItems: 'center', paddingTop: 5 },
  // v352: the rail styles (vnumBig / vnumRange / vnumTap) are gone
  // with the rail itself — the inline supTap span is the only
  // numeral the head carries now, in both modes.
  // v352: the verses stand as separate blocks — the gap between
  // verse blocks is 12 (the head's own rhythm is 10/13; 12 reads
  // as a clear paragraph step against the 26.5 leading without
  // scattering the chapter).
  entryVerses: { flex: 1, gap: 12 },
  // v357: a verse row is text + its own chevron, side by side.
  verseBlock: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  // v313: the verse type at the drawing's weight — 17.5 at
  // fontWeight 450 (RN steps to 500); the size and leading were
  // already the drawing's.
  entryVerse: { fontSize: 17.5, fontWeight: '500', lineHeight: 26.5 },
  // v217: the tint-selection handle is now an inline superscript
  // span inside the verse text (see the head render) — a text style,
  // no longer an in-flow rail with width of its own.
  supTap: { fontSize: 10.5, fontWeight: '800' },
  // v361: the verse number's seat as the selection text's lead
  // token — superscript height against the verse's first line.
  supSeat: { paddingTop: 4, marginRight: 3 },
  // v217: his own lines' in-flow column — the same measure as the
  // entry body, at the full text width (no bubble inset, ever).
  // v352: the measure moved with the rail's removal — verses now
  // start at x=32 in the entry (was 82: rail 40 + its gap 10 are
  // gone), and the notes keep their exact relationship, beginning
  // one head-gap (10) left of the verse text: 72 -> 22.
  selfLines: { marginLeft: 22, paddingRight: 4, paddingBottom: 6 },
  entryBody: { marginLeft: 22, paddingRight: 4, paddingBottom: 14 },
  // v357: the empty verse's one quiet door to a note.
  addNoteRow: { borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  addNoteText: { fontSize: 13.5, fontWeight: '600' },
  markbar: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderTopWidth: 1, paddingTop: 11, marginTop: 4 },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 999 },
  markBtnText: { fontSize: 12.5, fontWeight: '700' },
  swatches: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  swatch: { width: 19, height: 19, borderRadius: 999 },
  tintLabel: { fontSize: 11, fontWeight: '600' },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catChipText: { fontSize: 11, fontWeight: '700' },
  composer: { borderWidth: 1, borderRadius: 24, padding: 14, marginTop: 12 },
  composerLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  composerInput: { fontSize: 14.5, lineHeight: 21, minHeight: 44, textAlignVertical: 'top' },
  composerHint: { fontSize: 11.5, lineHeight: 16, marginTop: 8 },
  composerBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 8 },
  composerDelete: { marginRight: 'auto', paddingVertical: 4 },
  addBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  loading: { textAlign: 'center', fontSize: 13.5, marginTop: 26 },
  footNote: { fontSize: 12, lineHeight: 18, marginTop: 34, textAlign: 'center' },
  // v250: the mockup's dark pill — near-black in the seed's hue
  // (background inline), carrying the gold XP chip.
  markReadBtn: {
    marginTop: 20,
    // v313: the drawing's read button spans the text width.
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 999,
  },
  markReadText: { fontWeight: '700', fontSize: 15.5 },
  xpChip: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  xpChipText: { fontSize: 12.5, fontWeight: '800' },
  footRead: { marginTop: 20, alignItems: 'stretch' },
  footReadPill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, paddingVertical: 16 },
  footReadLine: { fontWeight: '700', fontSize: 15.5 },
  footReadSub: { fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: 'center' },
  chapterNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 10 },
  navBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  navOff: { opacity: 0.35 },
  // v248: the FAB's shadow color is the palette accent (inline) —
  // the fixed deep-raspberry shadow died with the fixed palette.
  // v313: the drawing's FAB — a 16px-radius primary-container
  // chip, not a filled pill (fill + glyph colors inline).
  fab: { position: 'absolute', right: 18, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 19, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { fontWeight: '600', fontSize: 14.5 },
});
