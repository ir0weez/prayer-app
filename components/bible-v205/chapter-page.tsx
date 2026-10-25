// ─── v205 chapter page ───────────────────────────────────────────────────────
// His polished Notion chapter, in the app: sticky topbar with the reading
// hairline, the slim study-status strip, Chapter 01 cover, the Stories
// doorway, Previously/Introduction, Contents, pink section bands, one
// toggle per verse entry, his blocks (callouts where he put them), the
// markup bar on every entry, the raspberry Verses FAB, and the index
// sheet behind it. Noteless chapters render the same page with the whole
// chapter as verse-only entries — the reader, index, search and marking
// tools all stay live.

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
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
  splitSectionsByHashNotes,
  type DisplaySection,
} from '@/lib/bible-v205/index';
import { entryKey, type NoteCategory, type StudyStatus, type V205Entry } from '@/lib/bible-v205/types';
import { entrySourceCategory, NOTE_CATEGORIES } from '@/lib/bible-v205/categories';
import { loadUserLabels, type UserLabels } from '@/lib/bible-v205/user-labels';
import {
  addKeeperLine,
  applyTintToSelection,
  isKept,
  loadMarks,
  marksFor,
  removeKeeperLineAt,
  resolveTintFields,
  saveMarks,
  scrubVerseTints,
  toggleKept,
  toggleVerseInSelection,
  updateKeeperLineAt,
  withMarks,
  type EntryMarks,
  type LineAuthor,
  type MarksMap,
  type TintColor,
} from '@/lib/bible-v205/marks';
import {
  buildBubblePieces,
  loadPeopleList,
  loadProfileIdentity,
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
import { AuthorPicker, LivingBubbles, kindLabelFor, type BloomTiming } from './bubbles';
import { IndexSheet } from './index-sheet';
import { StoriesView } from './stories-view';
import { chapterLabel, rangeLabel, tintWashFor, useBiblePalette, verseTintFor, type BiblePalette } from './palette';
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
  /** v230: open the devotional listen screen (only wired when the
   * devotional registry has an entry for this chapter). */
  onListen?: () => void;
}

/** App-level read-mode preference ("With notes" is the default). */
export const READ_MODE_KEY = 'prayercircle.bible.v205.readmode.v1';

export function ChapterPageView(props: ChapterPageProps) {
  const { book, chapter } = props;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
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
  // v212: verse-tint selection — per rendered entry (keyed by its
  // entry key, split pieces included), the verses he has tapped and
  // not yet tinted. Pure UI state; only the applied tints persist.
  const [verseSelection, setVerseSelection] = useState<Record<string, number[]>>({});
  // v214: the Living Bubble layer — the People list (the same stored
  // list the Journal's @mentions read, so author ids mean the same
  // person in both places), his profile identity for his own face,
  // and the one entry whose bubbles are open (mutual exclusion).
  const [people, setPeople] = useState<Person[]>([]);
  const [profile, setProfile] = useState<ProfileIdentity>({ name: '' });
  const [openBubblesKey, setOpenBubblesKey] = useState<string | null>(null);
  const scrollYRef = useRef(0);
  const [stories, setStories] = useState(!!props.initialStories);
  const [progress, setProgress] = useState(0);
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
  // v233: the display model — on a chapter with NO notes the strip
  // headlines READ, not a notes state (chapterDisplayMarks in study.ts).
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
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 128), animated: true });
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
  const handleTint = async (start: number, end: number, tint: TintColor | null) => {
    const span = tintWriteSpan(start, end);
    const next = withMarks(marks, book, chapter, span.start, span.end, { tint });
    setMarks(next);
    await saveMarks(next);
  };
  const handleVerseTintApply = async (start: number, end: number, hue: TintColor) => {
    const key = entryKey(book, chapter, start, end);
    const sel = verseSelection[key] ?? [];
    if (sel.length === 0) return;
    // Resolve against the DISPLAY map (split pieces carry their
    // partitioned records there), then write the result to the
    // UNSPLIT entry's record: verse tints live there, and the split
    // partitions re-derive from it on the next render.
    const resolved = resolveTintFields(displayMarks, book, chapter, start, end);
    const nextVerseTints = applyTintToSelection(resolved.verseTints, sel, hue);
    const covering = notesFlat.find((nf) => start >= nf.entry.start && start <= nf.entry.end);
    const span = covering ? { start: covering.entry.start, end: covering.entry.end } : { start, end };
    let next = withMarks(marks, book, chapter, span.start, span.end, { verseTints: nextVerseTints });
    // A toggled-off verse must also leave any OTHER stored record the
    // tint was resolved from (e.g. a record stored directly at a split
    // piece's key), or the display merge would paint it straight back.
    const removed = sel.filter((v) => nextVerseTints[v] === undefined && resolved.verseTints[v] !== undefined);
    if (removed.length) {
      next = scrubVerseTints(next, book, chapter, removed, entryKey(book, chapter, span.start, span.end));
    }
    setMarks(next);
    await saveMarks(next);
    setVerseSelection((prev) => ({ ...prev, [key]: [] }));
  };
  const handleToggleVerse = (start: number, end: number, verse: number) => {
    const key = entryKey(book, chapter, start, end);
    setVerseSelection((prev) => ({ ...prev, [key]: toggleVerseInSelection(prev[key] ?? [], verse) }));
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
  const handleCategory = async (start: number, end: number, category: NoteCategory | null) => {
    const next = withMarks(marks, book, chapter, start, end, { category });
    setMarks(next);
    await saveMarks(next);
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
      onExit={() => setStories(false)}
      onNextChapter={chapter < totalChapters ? () => props.onNavigateChapter(chapter + 1) : null}
    />
  ) : (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      {/* ── topwrap ── */}
      <View style={[styles.topwrap, { backgroundColor: palette.paper, borderBottomColor: palette.line }]}>
        <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
          <Pressable onPress={props.onBack} hitSlop={10} style={styles.topBtn}>
            <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
          </Pressable>
          <Text style={[styles.topTitle, { color: palette.ink }]} numberOfLines={1}>
            {book} · {chapterLabel(chapter)}
          </Text>
          <View style={styles.topActions}>
            <View style={[styles.keptPill, { backgroundColor: palette.band }]}>
              <Text style={{ color: palette.rose, fontSize: 11 }}>♥</Text>
              <Text style={[styles.keptPillText, { color: palette.bandInk }]}>{keptTotal} kept</Text>
            </View>
            <Pressable onPress={() => setSheet('verses')} hitSlop={8} style={styles.topBtn}>
              <MaterialIcons name="grid-view" size={19} color={palette.ink} />
            </Pressable>
            <Pressable onPress={() => setSheet('search')} hitSlop={8} style={styles.topBtn}>
              <MaterialIcons name="search" size={20} color={palette.ink} />
            </Pressable>
          </View>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: palette.band }]}>
          <View style={[styles.progressFill, { backgroundColor: palette.rasp, width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.modeRow}>
          <View style={[styles.modeSeg, { borderColor: palette.lineDark }]}>
            <Pressable
              style={[styles.modeBtn, !readOnly ? { backgroundColor: palette.rasp } : null]}
              onPress={() => chooseReadMode(false)}
            >
              <Text style={[styles.modeBtnText, { color: !readOnly ? '#FFFFFF' : palette.inkSoft }]}>With notes</Text>
            </Pressable>
            <Pressable
              style={[styles.modeBtn, readOnly ? { backgroundColor: palette.rasp } : null]}
              onPress={() => chooseReadMode(true)}
            >
              <Text style={[styles.modeBtnText, { color: readOnly ? '#FFFFFF' : palette.inkSoft }]}>Read only</Text>
            </Pressable>
          </View>
          {/* v230: the Listen door — exists ONLY when the devotional
              registry carries this chapter (purely registry-driven). */}
          {props.onListen && devotional ? (
            <Pressable
              onPress={props.onListen}
              hitSlop={8}
              style={[styles.listenBtn, { backgroundColor: palette.rasp }]}
              accessibilityLabel={`Listen — ${devotional.title}`}
            >
              <MaterialIcons name="play-arrow" size={15} color="#FFFFFF" />
              <Text style={styles.listenBtnText}>Listen</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.page}
        // v244: while a bubble thread is open the page holds still —
        // the blur strips and the dock are computed against this
        // scroll position, and the thread's own region scrolls
        // internally when it needs to.
        scrollEnabled={!openBubblesKey}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          viewHeight.current = layoutMeasurement.height;
          contentHeight.current = contentSize.height;
          scrollYRef.current = contentOffset.y;
          const max = contentSize.height - layoutMeasurement.height;
          setProgress(max > 0 ? Math.min(1, contentOffset.y / max) : 0);
        }}
        scrollEventThrottle={32}
      >
        {/* ── slim status strip — v228: passive display only. The
            notes chip and words describe the notes-written track;
            the read mark rides beside them when present. Nothing on
            this strip changes a state any more — the Queue link only
            navigates. v234: the strip's two marks wear the same two
            family labels as the book panel — COMMENTARY for the
            notes-written line, STUDY for the read line — so the two
            tracks never blur into one another here either. ── */}
        <View style={[styles.strip, { backgroundColor: palette.raspTint }]}>
          <View style={styles.stripMain}>
            {display?.headline === 'read' ? (
              <View style={styles.stripLine}>
                <Text style={[styles.stripLabel, { color: palette.inkSoft }]}>Study</Text>
                <ReadChip palette={palette} />
                <Text style={[styles.stripText, { color: palette.ink }]}>
                  {readDate
                    ? `Chapter ${chapter} — read ${formatReadDate(readDate)}. No notes for this chapter — reading is the whole mark.`
                    : `Chapter ${chapter} — read. No notes for this chapter, so a Complete here counts as Read.`}
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
          <View style={[styles.surfCard, { borderColor: '#F3CFE0', backgroundColor: palette.paper }]}>
            <View style={styles.surfHead}>
              <StatusChip status="restudy" palette={palette} />
              <Text style={[styles.surfTitle, { color: palette.ink }]}>Due another read</Text>
            </View>
            <Text style={[styles.surfBody, { color: palette.inkSoft }]}>
              This chapter sits in your Current list — notes finished, waiting for a second pass on the same ground.
            </Text>
            <View style={styles.surfBtns}>
              <Pressable
                style={[styles.surfBtn, styles.surfBtnPrimary, { backgroundColor: palette.rasp }]}
                onPress={props.onOpenQueue}
              >
                <Text style={styles.surfBtnPrimaryText}>Open in Queue</Text>
              </Pressable>
              <Pressable style={[styles.surfBtn, { borderColor: palette.lineDark }]} onPress={() => scrollToY(0)}>
                <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13 }}>Read Chapter</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* ── Stories doorway ── */}
        <View style={styles.doorway}>
          <Text style={[styles.doorNote, { color: palette.inkSoft }]}>
            The chapter page stays exactly as it is. Stories is simply a way <Text style={{ fontStyle: 'italic' }}>through</Text> it — for personal study, at reading pace.
          </Text>
          <Pressable
            style={[styles.readBtn, { backgroundColor: palette.rasp }]}
            onPress={() => {
              setOpenBubblesKey(null);
              setStories(true);
            }}
          >
            <Text style={styles.readBtnText}>▶  Read as Stories</Text>
          </Pressable>
          <Text style={[styles.readSub, { color: palette.inkFaint }]}>
            {readOnly
              ? 'Verses one screen at a time in Read-only mode. Tap right to keep going, left to go back.'
              : 'Verses and your notes, one screen at a time. Tap right to keep going, left to go back.'}
          </Text>
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

        {/* ── Introduction ── */}
        {!readOnly && chapterData?.intro.length ? (
          <View style={styles.block}>
            <Text style={[styles.label, { color: palette.inkFaint }]}>Introduction</Text>
            {chapterData.intro.map((b, i) =>
              i === 0 && b.kind === 'para' ? (
                <Text key={i} style={[styles.bodyPara, { color: palette.ink }]}>
                  <Text style={[styles.dropCap, { color: palette.raspDeep }]}>{b.text.charAt(0)}</Text>
                  {b.text.slice(1)}
                </Text>
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
        <View style={styles.block}>
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
        {sections.map((section) => (
          <View
            key={section.start}
            style={styles.sectionWrap}
            onLayout={(e) => yByKey.current.set(`secwrap-${section.start}`, e.nativeEvent.layout.y)}
          >
            <SectionBand start={section.start} end={section.end} title={section.title} palette={palette} />
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
                selectedVerses={verseSelection[entryKey(book, chapter, entry.start, entry.end)] ?? []}
                kept={entryStatus.get(entryKey(book, chapter, entry.start, entry.end))?.kept ?? false}
                open={isOpen(entry)}
                flash={flashKey === entryKey(book, chapter, entry.start, entry.end)}
                flashAnim={flashAnim}
                palette={palette}
                bubblePiece={piece}
                people={people}
                profile={profile}
                bubbleOpen={pieceKey !== null && openBubblesKey === pieceKey}
                bloom={bloom}
                viewportHeight={viewHeight.current > 0 ? viewHeight.current : Dimensions.get('window').height}
                topChrome={insets.top + 118}
                bottomReserve={112}
                entryScreenTop={entryY !== undefined ? entryY - scrollYRef.current : null}
                onBubbleToggle={(next) => setOpenBubblesKey(next && pieceKey ? pieceKey : null)}
                onToggleOpen={() => toggleOpen(entry)}
                onToggleKept={() => handleToggleKept(entry.start, entry.end, entry.blocks.some((b) => b.kind === 'highlight'))}
                onAddLine={(kind, text, author) => handleAddLine(entry.start, entry.end, kind, text, author)}
                onUpdateLine={handleUpdateLine}
                onRemoveLine={handleRemoveLine}
                onTint={(tint) => handleTint(entry.start, entry.end, tint)}
                onToggleVerse={(verse) => handleToggleVerse(entry.start, entry.end, verse)}
                onApplyVerseTint={(hue) => handleVerseTintApply(entry.start, entry.end, hue)}
                onCategory={(category) => handleCategory(entry.start, entry.end, category)}
                registerY={(y) =>
                  yByKey.current.set(
                    entryKey(book, chapter, entry.start, entry.end),
                    (yByKey.current.get(`secwrap-${section.start}`) ?? 0) + y,
                  )
                }
              />
              );
            })}
          </View>
        ))}

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
            style={[styles.markReadBtn, { borderColor: palette.rasp }]}
            accessibilityLabel={`Mark ${book} ${chapter} as read`}
            onPress={handleMarkRead}
          >
            <Text style={[styles.markReadText, { color: palette.raspDeep }]}>Mark as Read</Text>
          </Pressable>
        ) : null}
        {studyState !== null && readDate !== null ? (
          <View style={styles.footRead}>
            <Text style={[styles.footReadLine, { color: palette.inkSoft }]}>✓ Read · {formatReadDate(readDate)}</Text>
            <Pressable onPress={handleClearRead} hitSlop={8} accessibilityLabel={`Clear the read mark for ${book} ${chapter}`}>
              <Text style={[styles.footReadSub, { color: palette.inkFaint, textDecorationLine: 'underline' }]}>
                Clear the read mark
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.chapterNav}>
          <Pressable
            style={[styles.navBtn, { borderColor: palette.lineDark }, chapter <= 1 ? styles.navOff : null]}
            disabled={chapter <= 1}
            onPress={() => props.onNavigateChapter(chapter - 1)}
          >
            <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13.5 }}>‹ {chapterLabel(chapter - 1)}</Text>
          </Pressable>
          <Pressable
            style={[styles.navBtn, { borderColor: palette.lineDark }, chapter >= totalChapters ? styles.navOff : null]}
            disabled={chapter >= totalChapters}
            onPress={() => props.onNavigateChapter(chapter + 1)}
          >
            <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 13.5 }}>{chapterLabel(chapter + 1)} ›</Text>
          </Pressable>
        </View>
        <View style={{ height: 96 }} />
      </ScrollView>

      {/* ── Verses FAB ── */}
      {!sheet ? (
        <Pressable style={[styles.fab, { backgroundColor: palette.rasp }]} onPress={() => setSheet('verses')}>
          <MaterialIcons name="grid-view" size={16} color="#FFFFFF" />
          <Text style={styles.fabText}>Verses</Text>
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

  if (skin === 'paper') return <PaperSettle>{content}</PaperSettle>;
  if (skin === '8bit') return <BitSettle>{content}</BitSettle>;
  return content;
}


// ─── One verse entry: toggle + his blocks + the markup bar ──────────────────

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
  /** v212: verses tapped and waiting for a tint color (this entry only). */
  selectedVerses: number[];
  kept: boolean;
  open: boolean;
  flash: boolean;
  flashAnim: Animated.Value;
  palette: BiblePalette;
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
  onTint: (tint: TintColor | null) => void;
  onToggleVerse: (verse: number) => void;
  onApplyVerseTint: (hue: TintColor) => void;
  onCategory: (category: NoteCategory | null) => void;
  registerY: (y: number) => void;
}) {
  const { entry, palette } = props;
  const [composer, setComposer] = useState<null | 'highlight' | 'thought' | 'note'>(null);
  const [draft, setDraft] = useState('');
  // v214: the composer's "Who said this?" pick (null = Me) and, when
  // the composer was opened from an open bubble's pencil, the storage
  // target of the line being edited.
  const [composerAuthor, setComposerAuthor] = useState<LineAuthor | null>(null);
  const [editingTarget, setEditingTarget] = useState<LineStorageTarget | null>(null);
  const openComposer = (kind: 'highlight' | 'thought' | 'note') => {
    setComposer(kind);
    setDraft('');
    setComposerAuthor(null);
    setEditingTarget(null);
  };
  const closeComposer = () => {
    setComposer(null);
    setEditingTarget(null);
    setComposerAuthor(null);
  };
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
  const single = entry.start === entry.end;
  // v212: the entry tint washes the whole entry container — head and
  // body, open or closed. (The jump-flash still wins while it runs.)
  const wash = tintWashFor(palette, props.entryTint);
  const flashBg = props.flash
    ? props.flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(230,73,128,0)', 'rgba(230,73,128,0.14)'] })
    : (wash ?? 'transparent');
  const hasSelection = props.selectedVerses.length > 0;

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
      style={[styles.entry, { backgroundColor: flashBg }, props.bubbleOpen ? styles.entryOpen : null]}
      onLayout={(e) => props.registerY(e.nativeEvent.layout.y)}
    >
      <Pressable
        style={[styles.entryHead, hasBubbles ? styles.entryHeadBubbled : null]}
        onPress={props.onToggleOpen}
        onLayout={(e) => {
          const h = e.nativeEvent.layout.height;
          setHeadH((prev) => (prev !== null && Math.abs(prev - h) < 1 ? prev : h));
        }}
      >
        <View style={styles.heartSlot}>
          {props.kept ? <Text style={{ color: palette.rose, fontSize: 14 }}>♥</Text> : null}
        </View>
        {single ? (
          <Pressable
            onPress={() => props.onToggleVerse(entry.start)}
            hitSlop={8}
            style={[styles.vnumTap, props.selectedVerses.includes(entry.start) ? { backgroundColor: palette.rasp } : null]}
          >
            <Text
              style={[
                styles.vnumBig,
                { color: props.selectedVerses.includes(entry.start) ? '#FFFFFF' : palette.vnum },
              ]}
            >
              {entry.start}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.vnumRange, { color: palette.vnum }]}>{entry.start}–{entry.end}</Text>
        )}
        <View style={styles.entryVerses}>
          {Array.from({ length: entry.end - entry.start + 1 }, (_, i) => entry.start + i).map((v) => {
            const selected = props.selectedVerses.includes(v);
            const verseBg = verseTintFor(palette, props.verseTints[v]);
            return (
              <Text
                key={v}
                style={[
                  styles.entryVerse,
                  { color: palette.ink },
                  verseBg ? { backgroundColor: verseBg } : null,
                  selected
                    ? { textDecorationLine: 'underline', textDecorationStyle: 'dashed', textDecorationColor: palette.rasp }
                    : null,
                ]}
              >
                {!single ? (
                  // v217 squeeze fix: the verse number is an INLINE
                  // superscript in the text (the approved mockup's
                  // rendering), not a rail beside it — a multi-verse
                  // entry's text now starts at the same x as a
                  // single-verse entry's. It stays the v212 tint
                  // handle: a tap selects the verse; selected, it
                  // fills raspberry with white glyphs over the
                  // verse's dashed underline.
                  <Text
                    onPress={() => props.onToggleVerse(v)}
                    style={[
                      styles.supTap,
                      { color: selected ? '#FFFFFF' : palette.rasp },
                      selected ? { backgroundColor: palette.rasp } : null,
                    ]}
                  >
                    {v}{' '}
                  </Text>
                ) : null}
                {props.verseText.get(v) ?? ''}
              </Text>
            );
          })}
        </View>
        <MaterialIcons
          name={props.open ? 'expand-less' : 'expand-more'}
          size={19}
          color={palette.inkFaint}
          style={{ marginTop: 3 }}
        />
      </Pressable>

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
            return (
              <Pressable
                key={`${line.kind}-${line.fieldIndex}-${i}`}
                onPress={() => editSelfLine(i)}
                hitSlop={4}
              >
                <SelfLineBlock kind={line.kind} text={line.text} palette={palette} />
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
            <Text style={[styles.noNotes, { color: palette.inkFaint }]}>
              No notes on this verse — it stands on its own here.
            </Text>
          ) : (
            blocks.map((b, i) => (
              <BlockView key={i} block={b} palette={palette} />
            ))
          )}

          <View style={[styles.markbar, { borderTopColor: palette.line }]}>
            <Pressable style={styles.markBtn} onPress={props.onToggleKept}>
              <Text style={{ color: props.kept ? palette.rose : palette.inkSoft, fontSize: 13 }}>♥</Text>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>{props.kept ? 'Kept' : 'Keep'}</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => openComposer('highlight')}>
              <Text style={{ color: palette.hlMark, fontSize: 12 }}>✦</Text>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Highlight</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => openComposer('thought')}>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Main Thought</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => openComposer('note')}>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Note</Text>
            </Pressable>
            <View style={styles.swatches}>
              {(['yellow', 'rose', 'green'] as TintColor[]).map((t) => {
                // v212: with verses selected, the dots speak for the
                // selection — ringed when every selected verse already
                // wears this hue; a tap applies it to the selection
                // (or lifts it, per verse). With no selection they keep
                // their entry-tint meaning exactly as before.
                const active = hasSelection
                  ? props.selectedVerses.every((v) => props.verseTints[v] === t)
                  : props.entryTint === t;
                return (
                  <Pressable
                    key={t}
                    style={[
                      styles.swatch,
                      {
                        backgroundColor: t === 'yellow' ? '#F5C542' : t === 'rose' ? '#F08BB4' : '#7FCB9B',
                        borderColor: active ? palette.ink : 'transparent',
                        borderWidth: active ? 2 : 0,
                      },
                    ]}
                    onPress={() => (hasSelection ? props.onApplyVerseTint(t) : props.onTint(props.entryTint === t ? null : t))}
                  />
                );
              })}
              <Text style={[styles.tintLabel, { color: palette.inkFaint }]}>
                {hasSelection ? `Tint ${props.selectedVerses.length === 1 ? 'verse' : 'verses'} ${props.selectedVerses.join(', ')}` : 'Tint'}
              </Text>
            </View>
          </View>

          <View style={styles.catRow}>
            {NOTE_CATEGORIES.map((meta) => {
              const active = props.marksEntry?.category === meta.id;
              return (
                <Pressable
                  key={meta.id}
                  style={[
                    styles.catChip,
                    { borderColor: active ? meta.color : palette.line, backgroundColor: active ? meta.bg : palette.paper },
                  ]}
                  onPress={() => props.onCategory(active ? null : meta.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.catChipText, { color: active ? meta.ink : palette.inkSoft }]}>{meta.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {composer ? (
            <View style={[styles.composer, { borderColor: palette.lineDark, backgroundColor: palette.paper }]}>
              <Text style={[styles.composerLabel, { color: composer === 'highlight' ? palette.yellowLabel : palette.greyLabel }]}>
                {editingTarget
                  ? `Editing ${kindLabelFor(composer)}`
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
                  style={[styles.addBtn, { backgroundColor: palette.rasp }]}
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
  topwrap: { borderBottomWidth: 1 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topBtn: { padding: 2 },
  topTitle: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, flex: 1 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  keptPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  keptPillText: { fontSize: 11.5, fontWeight: '800' },
  progressTrack: { height: 3 },
  progressFill: { height: 3 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 8, paddingBottom: 2 },
  modeSeg: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 2, gap: 2 },
  listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 999, paddingVertical: 5, paddingLeft: 8, paddingRight: 12 },
  listenBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  modeBtn: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14 },
  modeBtnText: { fontSize: 12, fontWeight: '700' },
  page: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 8 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: -20, paddingVertical: 9, paddingHorizontal: 20 },
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
  surfCard: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 18 },
  surfHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  surfTitle: { fontSize: 15, fontWeight: '800' },
  surfBody: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  surfBtns: { flexDirection: 'row', gap: 9, marginTop: 12 },
  surfBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },
  surfBtnPrimary: { borderWidth: 0 },
  surfBtnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  doorway: { alignItems: 'center', marginTop: 20, paddingHorizontal: 6 },
  doorNote: { textAlign: 'center', fontSize: 13.5, lineHeight: 21.5 },
  readBtn: { borderRadius: 999, paddingVertical: 12, paddingHorizontal: 26, marginTop: 14 },
  readBtnText: { color: '#FFFFFF', fontSize: 14.5, fontWeight: '800' },
  readSub: { fontSize: 12, lineHeight: 17.5, textAlign: 'center', marginTop: 10, paddingHorizontal: 16 },
  block: { marginTop: 30 },
  label: { fontSize: 10.5, letterSpacing: 2.2, textTransform: 'uppercase', fontWeight: '800', marginBottom: 12 },
  bodyPara: { fontSize: 15, lineHeight: 25.5, marginBottom: 12 },
  dropCap: { fontSize: 44, fontWeight: '800' },
  refCallout: { borderLeftWidth: 3, borderRadius: 4, paddingVertical: 12, paddingHorizontal: 15, marginVertical: 12 },
  refQuote: { fontStyle: 'italic', fontSize: 14, lineHeight: 23 },
  contentsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  tocNote: { fontSize: 11 },
  tocRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingVertical: 7 },
  tocNum: { fontWeight: '800', fontSize: 12.5, width: 22 },
  tocTitle: { fontWeight: '600', fontSize: 14.5 },
  leader: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', minWidth: 14 },
  tocRange: { fontSize: 11.5 },
  sectionWrap: { marginTop: 34 },
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
  vnumBig: { fontSize: 28, fontWeight: '300', width: 40, lineHeight: 32, textAlign: 'center' },
  vnumRange: { fontSize: 15.5, fontWeight: '700', width: 40, lineHeight: 32, textAlign: 'center' },
  entryVerses: { flex: 1, gap: 3 },
  entryVerse: { fontSize: 15.5, fontWeight: '700', lineHeight: 24 },
  vnumTap: { borderRadius: 9 },
  // v217: the tint-selection handle is now an inline superscript
  // span inside the verse text (see the head render) — a text style,
  // no longer an in-flow rail with width of its own.
  supTap: { fontSize: 10.5, fontWeight: '800' },
  // v217: his own lines' in-flow column — the same measure as the
  // entry body, at the full text width (no bubble inset, ever).
  selfLines: { marginLeft: 72, paddingRight: 4, paddingBottom: 6 },
  entryBody: { marginLeft: 72, paddingRight: 4, paddingBottom: 14 },
  noNotes: { fontSize: 13.5, fontStyle: 'italic', marginBottom: 10 },
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
  composer: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  composerLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 8 },
  composerInput: { fontSize: 14.5, lineHeight: 21, minHeight: 44, textAlignVertical: 'top' },
  composerHint: { fontSize: 11.5, lineHeight: 16, marginTop: 8 },
  composerBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 14, marginTop: 8 },
  composerDelete: { marginRight: 'auto', paddingVertical: 4 },
  addBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  loading: { textAlign: 'center', fontSize: 13.5, marginTop: 26 },
  footNote: { fontSize: 12, lineHeight: 18, marginTop: 34, textAlign: 'center' },
  markReadBtn: {
    marginTop: 20,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  markReadText: { fontWeight: '800', fontSize: 15 },
  footRead: { marginTop: 20, alignItems: 'center' },
  footReadLine: { fontWeight: '800', fontSize: 15 },
  footReadSub: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  chapterNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 10 },
  navBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  navOff: { opacity: 0.35 },
  fab: { position: 'absolute', right: 18, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 17, shadowColor: '#9C1B49', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
});
