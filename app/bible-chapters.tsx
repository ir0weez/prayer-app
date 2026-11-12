// ─── v205 Books view ─────────────────────────────────────────────────────────
// v206 reframe (his ruling — only app progress counts): the groups were
// progress books, "Chapter notes", handwritten-only rows, and the quiet
// rest of the canon. v222 replaces all four with THREE sections over
// ALL 66 books, from the study store alone: Current (his currentBook
// first, then every other book with any state, not finished), Finished
// (every chapter Complete), Not Started (no chapter states). A book
// with notes but no states lands in Not Started with its notes count on
// the row — notes no longer earn a book its own section.
// v311 "The Bible, to the Drawing" (approved Oct 28, 12:42): the rows
// go quiet and spacious at the drawing's measure — the book name at
// 22px on its OWN line, NOTHING truncating (the clipped "Hebrew…"
// was a named defect), the counts line beneath it in full; the
// status-chip legend is retired and only the ✎ notes-source door
// stays. (v325 supersedes the card half of that sentence — the
// reset stands, the card is replaced below.)
// v322 (his ruling, 2026-10-28 20:12): the sections re-sort by
// channel — Finished now counts the READ ones only (Genesis sat
// there at 50 of 50 written, 0 read), and writing-complete books
// get their own Written section. The grouping itself lives in
// groupBooksByStudy; this screen only renders its sections.
// v421 (his ask, Nov 2): a fifth section — RESTUDY, directly under
// Current, rendered only when non-empty. Books with chapters in
// the restudy queue surfaced here; the row kept the card anatomy,
// its pill seat carried ↻ RESTUDY and a line under the counts
// named the next queued chapter.
// v424 (his ruling, Nov 2 — Concept 2 of
// restudy-reading-concepts-v1.html, "make it material design
// though"): the Restudy SECTION is retired. Reading and restudy
// are separate tracks that coexist — a book he is reading through
// now (Genesis) must not be evicted from its reading/writing
// section by a queue he means to work later. The grouping is the
// four sections of v322/v383 again, the book cards carry NO
// restudy pill or line, and the queue's one home on this page is
// a single Material tonal card at the top (RestudyQueueCard
// below), rendered only while the queue is non-empty.
// v422 (his word, Nov 2 — "get rid of this on paper thing"): every
// visible on-paper surface is removed from this screen — the chip
// under the progress header (and the notes-source label editor it
// opened; that editor carried only the source label, whose sole
// consumers were these marks) and the per-row marks fed by the
// handwritten coverage. The coverage record itself is NOT touched:
// lib/bible-v205/handwritten keeps its store, seed and loaders,
// dormant. The book page's chapter chip goes in the same pass.
// v324 (his words, 2026-10-28 21:00 — "I have multiple entire books
// finished with notes"): Written membership and the rows' written
// counts now follow the union rule (rewards.ts chapterIsWritten —
// stored Complete OR notes in the resolved data, studio imports
// included). The screen loads the imports map on focus and hands
// it to both the grouping and every row, so the count a row prints
// and the section it sits in are the same fact.
// v502 (his pick, Nov 11 — downloaded-audio-on-study-v4.html,
// "Love this. Build it."): a second card joins the Restudy card
// at the top — Downloaded audio, seated directly under it in the
// same anatomy (tonal tint, circular disc, title + one line,
// chevron, whole card one tap), rendered only while at least one
// on-demand download is verified on disk (lib/downloads.ts — the
// v501 disk-truth rule). Its tint and disc wear the NEWEST
// download's book family (v420 book colours); title and line keep
// the page ink, exactly as the Restudy card keeps its own. The
// card opens the Downloads page (app/bible-downloads.tsx).
// v503 (his picks, Nov 11): a chip row where the first section
// label sat (books-section-filter-v1.html) — All · Current ·
// Finished · Written · Not Started — so the sections filter with
// a tap instead of endless scrolling. All is the page exactly as
// it stood; a section chip stands that one group alone, its own
// label dropped (the lit chip says it). The row pins to the top
// of the scroll area while the header cards scroll away beneath
// it. The switch runs Motion 3, "Travelling Pill"
// (books-filter-motion-v4.html): the selected chip's fill is ONE
// pill that slides and stretches to the tapped chip (380ms,
// Material emphasized — components/bible-v205/books-filter-bar),
// while the list crossfades — out over 120ms, back in settling
// from scale 0.98 over 300ms. The filter's model is pure
// (lib/bible-v205/books-filter.ts); group membership is still
// groupBooksByStudy's alone, and the state is screen-local —
// every mount starts at All.
// v325: the v305 overall reading card is replaced by the approved
// progress header (study-progress-concepts-v3.html, Concept 3 —
// Two Structured Rows): both tracks, their book counts and their
// remainders in one radius-24 card, with the reset line under it
// (the reset itself is unchanged — it still clears only reads).
// The rows' tallies all come from rewards.ts bookChapterTallies,
// whose written + toWrite = chapter count invariant retires the
// "1 of 4 written · 4 to write" double count.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import {
  CHAPTER_COUNTS,
  notesChapterCount,
} from '@/lib/bible-v205/index';
import {
  loadStudyState,
  saveStudyState,
  seedStudyState,
  setCurrentBook as setStudyCurrentBook,
  type StudyState,
} from '@/lib/bible-v205/study';
import {
  bookChapterTallies,
  bookIsComplete,
  groupBooksByStudy,
  restudyQueueSummary,
  studyProgressTotals,
  type RestudyQueueSummary,
} from '@/lib/bible-v205/rewards';
import {
  loadStudioImports,
  type StudioImportsMap,
} from '@/lib/bible-v205/studio-import';
import {
  bookReadCount,
  resetReadingProgress,
} from '@/lib/bible-v205/reading-progress';
import { clearNoteCollapse } from '@/lib/bible-v205/note-collapse';
import { BookReadingThread, StudyProgressHeader } from '@/components/bible-v205/reading-progress-card';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';
import { useBiblePalette, useBookBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from '@/components/top-fade';
import {
  loadUserLabels,
  type UserLabels,
} from '@/lib/bible-v205/user-labels';
import { bibleShellParamsForRoute, type BiblePaneNav } from '@/lib/bible-pane';
import {
  downloadsCardModel,
  refreshDownloads,
  useDownloadedAudio,
  type DownloadsCardModel,
} from '@/lib/downloads';
import ReAnimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BooksFilterBar, useReduceMotionEnabled } from '@/components/bible-v205/books-filter-bar';
import {
  CONTENT_FADE_IN_MS,
  CONTENT_FADE_OUT_MS,
  CONTENT_SETTLE_FROM_SCALE,
  EMPHASIZED_DECELERATE_EASING,
  visibleBookSections,
  type BooksFilterKey,
} from '@/lib/bible-v205/books-filter';

const CANON = Object.keys(CHAPTER_COUNTS);

/** v265: this screen lives two lives. As a root-stack route (a
 * deep link's landing shell — nothing in the app navigates here
 * anymore) it drives the router as it always has. Inside the
 * shell's Study pane it receives `pane` — navigation callbacks,
 * the pane's focus flag, and the Jump-to-Book nonce — and the
 * router stays untouched. */
export interface BibleBooksPaneProps {
  nav: BiblePaneNav;
  focused: boolean;
  bookNavNonce: number;
}

export default function BibleBooksScreen(props: { pane?: BibleBooksPaneProps } = {}) {
  const fadeScrollY = useTopFadeScrollY();
  const router = useRouter();
  const inPane = !!props.pane;
  // v211: the Personal Study card's Books button lands here with
  // openBookNav=1 — open the Jump to Book sheet on arrival. The sheet
  // is also one tap from the topbar.
  const params = useLocalSearchParams<{ openBookNav?: string }>();
  const [bookNavOpen, setBookNavOpen] = useState(false);
  useEffect(() => {
    if (params.openBookNav === '1') setBookNavOpen(true);
  }, [params.openBookNav]);
  // v265 (pane mode): the same arrival, as a nonce — the shell
  // bumps it when a Personal Study entry asks for the picker.
  const bookNavNonce = props.pane?.bookNavNonce ?? 0;
  useEffect(() => {
    if (bookNavNonce > 0) setBookNavOpen(true);
  }, [bookNavNonce]);
  // v265 (pane mode): the pane stays mounted across tab hops, so
  // this screen's sheets must not outlive its focus — in route
  // mode leaving the screen unmounted it; here, losing pane focus
  // (a covered Books, a switched tab) closes them instead.
  const paneFocused = props.pane?.focused ?? false;
  useEffect(() => {
    if (inPane && !paneFocused) {
      setBookNavOpen(false);
      setResetOpen(false);
    }
  }, [inPane, paneFocused]);
  // v207: the top safe-area inset the rest of the app applies — without
  // it the topbar slides up under the Android notification tray.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  // v259: the app tab bar rides over this screen (Study active) —
  // the list's foot spacer clears it by its occupied height.
  const tabBarHeight = useTabBarOccupiedHeight();
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  // v324: the studio imports map rides the same focus reload as the
  // study state — an import landed from Settings changes which
  // chapters carry notes, hence Written membership and row counts.
  const [studioImports, setStudioImports] = useState<StudioImportsMap>({});
  const [labels, setLabels] = useState<UserLabels | null>(null);
  // v305: the reading reset's confirmation — the card's quiet door
  // opens this; nothing clears until he confirms here.
  const [resetOpen, setResetOpen] = useState(false);

  // v263: focus reloads the STUDY STATE only — Read/Complete marks
  // made on the book/chapter screens must be fresh when he lands
  // back here, and this is the one store that changes elsewhere.
  const reloadStudyState = useCallback(() => {
    let live = true;
    loadStudyState().then((s) => live && setStudyState(s));
    loadStudioImports().then((m) => live && setStudioImports(m));
    // v502: the downloads list re-reads the disk on the same
    // focus — a tour downloaded or removed on the book page (or
    // the Downloads page) must be true here when he lands back.
    void refreshDownloads();
    return () => {
      live = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      // v265: in the pane, "focus" is the pane's own flag (below) —
      // the route never blurs while the pane lives inside it.
      if (inPane) return;
      return reloadStudyState();
    }, [inPane, reloadStudyState]),
  );
  // v265 (pane mode): becoming the pane's visible screen (the tab
  // switched to Study, or a pane back landed here) is the focus
  // event — reload the study state then, exactly as route focus did.
  useEffect(() => {
    if (!inPane || !paneFocused) return;
    return reloadStudyState();
  }, [inPane, paneFocused, reloadStudyState]);

  // v263: labels load ONCE, on mount. They only ever change from
  // the profile, so re-reading them on every focus was pure cost
  // on the tab-switch path: extra storage loads and full 66-row
  // re-renders landed inside the switch's first frames every time
  // he hopped People → Study. A refocus now costs one load and one
  // re-render, and unrelated re-renders (the sheets opening) reuse
  // the memoized grouping below.
  // v422: this effect also loaded the handwritten coverage, which
  // fed only the on-paper marks removed in this pass — the load
  // goes with them. The coverage store itself is untouched.
  useEffect(() => {
    let live = true;
    loadUserLabels().then((l) => live && setLabels(l));
    return () => {
      live = false;
    };
  }, []);

  // v222: all 66 books, from the study store alone. v322: FOUR
  // sections — Finished (fully read) and Written (fully written)
  // split by channel, then Current and Not Started. v424: the
  // four sections stand as they were (the v421 Restudy section is
  // retired — see the header note); the queue reaches this screen
  // only through the summary that feeds the top card. v324: Written
  // also reads the resolved notes data (imports included), so the
  // fully-noted books seat there from the first paint — the seed
  // state no longer puts every book in Not Started.
  const effectiveState = studyState ?? seedStudyState();
  const groups = useMemo(
    () => groupBooksByStudy(effectiveState, CANON, studioImports),
    [effectiveState, studioImports],
  );
  // v424: the Restudy queue card's model — null while the queue is
  // empty, and the card simply does not render.
  const restudySummary = useMemo(
    () => restudyQueueSummary(effectiveState),
    [effectiveState],
  );
  // v502: the Downloaded audio card's model — invisible while
  // nothing is verified on disk (useDownloadedAudio reads the
  // shared disk-truth store; the focus reload above refreshes it).
  const downloadedAudio = useDownloadedAudio();
  const downloadsModel = useMemo(
    () => downloadsCardModel(downloadedAudio),
    [downloadedAudio],
  );
  // v503: the section filter. Two seats for one fact — the CHIP
  // selection moves at the tap (the travelling pill and the lit
  // label never wait), while the SECTION on the page swaps only
  // once the list's 120ms fade-out has run, so the eye never sees
  // a hard cut mid-list. Both start at All on every mount; the
  // ref is the tap's target, which is what a repeated tap on the
  // same chip no-ops against (even mid-fade).
  const reduceMotion = useReduceMotionEnabled();
  const [chipSelection, setChipSelection] = useState<BooksFilterKey>('all');
  const [sectionFilter, setSectionFilter] = useState<BooksFilterKey>('all');
  const filterTargetRef = useRef<BooksFilterKey>('all');
  const filterSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listOpacity = useSharedValue(1);
  const listScale = useSharedValue(1);
  const listAnimStyle = useAnimatedStyle(() => ({
    opacity: listOpacity.value,
    transform: [{ scale: listScale.value }],
  }));
  useEffect(
    () => () => {
      if (filterSwapTimerRef.current) clearTimeout(filterSwapTimerRef.current);
    },
    [],
  );
  const selectFilter = (key: BooksFilterKey) => {
    if (key === filterTargetRef.current) return;
    filterTargetRef.current = key;
    setChipSelection(key);
    if (filterSwapTimerRef.current) clearTimeout(filterSwapTimerRef.current);
    if (reduceMotion) {
      // Reduce motion: a plain cut — no fade, no settle, the
      // pill already jumped inside the bar.
      listOpacity.value = 1;
      listScale.value = 1;
      setSectionFilter(key);
      return;
    }
    // Motion 3's list half: out over 120ms, then the swap, then
    // back in from scale 0.98 over 300ms on emphasized
    // decelerate. The easing is built here, in the handler —
    // never during render (see books-filter-bar's note).
    const settle = Easing.bezier(
      EMPHASIZED_DECELERATE_EASING[0],
      EMPHASIZED_DECELERATE_EASING[1],
      EMPHASIZED_DECELERATE_EASING[2],
      EMPHASIZED_DECELERATE_EASING[3],
    );
    listOpacity.value = withTiming(0, { duration: CONTENT_FADE_OUT_MS, easing: settle });
    filterSwapTimerRef.current = setTimeout(() => {
      setSectionFilter(key);
      listScale.value = CONTENT_SETTLE_FROM_SCALE;
      listOpacity.value = 0;
      listOpacity.value = withTiming(1, { duration: CONTENT_FADE_IN_MS, easing: settle });
      listScale.value = withTiming(1, { duration: CONTENT_FADE_IN_MS, easing: settle });
    }, CONTENT_FADE_OUT_MS);
  };
  // v503: the sections the list renders — All is groupBooksByStudy
  // exactly as the page has always rendered it; a filter stands
  // one group alone, label off (lib/bible-v205/books-filter.ts).
  const filterSections = useMemo(
    () => visibleBookSections(groups, sectionFilter),
    [groups, sectionFilter],
  );
  // v305: the READING aggregate over the same state — the v228 read
  // track counted by lib/bible-v205/reading-progress, a different
  // track from the study counts the sections and rows below carry.
  const progress = useMemo(
    () => studyProgressTotals(effectiveState, CANON, studioImports),
    [effectiveState, studioImports],
  );
  // v241: the canon is 66 books — a grouping with zero books across
  // all four sections is impossible in a healthy build, so it gets a
  // visible word (below) instead of an empty page.
  const totalBooks = groups.current.length + groups.finished.length + groups.written.length + groups.notStarted.length;
  const possessive = labels?.possessive ?? 'Your';

  const renderBookRow = (book: string) => (
    <BookRow
      key={book}
      book={book}
      studyState={effectiveState}
      palette={palette}
      notesCount={notesChapterCount(book)}
      imports={studioImports}
      onPress={() => openBook(book)}
      onMakeCurrent={makeCurrent}
    />
  );

  const openBook = (book: string) => {
    // v265: pane mode walks the pane stack. Route mode (a deep
    // link's landing) hands off to the shell's pane — no code path
    // in the app navigates to the Bible routes anymore, not even
    // this screen's own.
    if (props.pane) props.pane.nav.openBook(book);
    else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'book', book }) });
  };
  const goBack = () => {
    // The root's back chevron leaves the section — in the pane,
    // that is the shell's tab switch (nav.exit); as a route it
    // popped the stack.
    if (props.pane) props.pane.nav.exit();
    else router.back();
  };
  const openQueue = () => {
    if (props.pane) props.pane.nav.openQueue();
    else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'queue' }) });
  };
  const openDownloads = () => {
    if (props.pane) props.pane.nav.openDownloads();
    else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'downloads' }) });
  };

  // v211: "mark it as current" is back — and it writes the NEW study
  // store (the position the Personal Study card reads), not the legacy
  // unified store the pre-v205 pill wrote.
  const makeCurrent = async (book: string) => {
    const fresh = await loadStudyState();
    const next = setStudyCurrentBook(fresh, book);
    await saveStudyState(next);
    setStudyState(next);
  };

  // v305: the whole-Bible reading reset, confirmed in the modal
  // below. It reloads the freshest state (read marks are written
  // from other screens too), empties ONLY the read track via
  // resetReadingProgress, and saves — notes, queues, study states,
  // current book and position all ride through untouched.
  // v391 (his addendum): the reset also clears the note open/closed
  // record, so the fresh read-through starts with every note back
  // open at its default — the note TEXTS are untouched, only the
  // remembered fold states go.
  const resetReading = async () => {
    const fresh = await loadStudyState();
    const next = resetReadingProgress(fresh);
    await saveStudyState(next);
    await clearNoteCollapse();
    setStudyState(next);
    setResetOpen(false);
  };

  const content = (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: inPane ? 8 : insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>Bible</Text>
        <Pressable
          onPress={() => setBookNavOpen(true)}
          hitSlop={8}
          style={{ padding: 2 }}
          accessibilityRole="button"
          accessibilityLabel="Jump to Book"
        >
          <MaterialIcons name="list" size={21} color={palette.ink} />
        </Pressable>
        <Pressable
          onPress={openQueue}
          style={[styles.queueBtn, { backgroundColor: palette.band }, palette.btnDress]}
        >
          <Text style={[styles.queueBtnText, { color: palette.raspDeep }]}>Study Queue</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} onScroll={topFadeScrollHandler(fadeScrollY)} scrollEventThrottle={16} stickyHeaderIndices={[1]}>
        {/* v503: the header cluster is ONE child of the scroll
            view (title, progress, the Restudy and Downloaded
            audio cards, the zero-books guard), so the sticky
            index below is stable however many of its conditional
            cards stand: child 0 = this cluster, child 1 = the
            filter bar, which pins to the top while the cluster
            scrolls away beneath it. */}
        <View>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }, palette.h2Size != null ? { fontSize: palette.h2Size } : null]}>{possessive} Books</Text>
        </View>

        {/* v325: the approved progress header replaces the v305
            reading card in its seat — both tracks live here now,
            so no read statistic is duplicated on a second surface.
            The reset line under the card still opens the same
            confirmation below and clears only reads. */}
        <View style={{ marginTop: 18 }}>
          <StudyProgressHeader
            progress={progress}
            palette={palette}
            onResetPress={() => setResetOpen(true)}
          />
        </View>

        {/* v424: the Restudy queue's one home on this page — a
            single Material tonal card above the first section,
            present only while the queue is non-empty. It names
            the queue's next chapter and how many books wait; the
            whole card opens the Study Queue, the same door as
            the topbar button. The book cards below carry no
            restudy marks at all (Concept 2). */}
        {restudySummary ? (
          <RestudyQueueCard summary={restudySummary} palette={palette} onPress={openQueue} />
        ) : null}

        {/* v502: Downloaded audio — the Restudy card's sibling,
            seated directly under it, present only while a
            download is verified on disk. The whole card opens
            the Downloads page. */}
        {downloadsModel.visible && downloadsModel.newestBook ? (
          <DownloadedAudioCard
            model={downloadsModel}
            book={downloadsModel.newestBook}
            palette={palette}
            onPress={openDownloads}
          />
        ) : null}

        {totalBooks === 0 ? (
          <View style={styles.emptyGuard}>
            <Text style={[styles.emptyTitle, { color: palette.ink }]}>The book list couldn&rsquo;t be built</Text>
            <Text style={[styles.emptyBody, { color: palette.inkSoft }]}>
              All 66 books belong on this page — an empty list means something went wrong while
              loading them, not that anything was lost. Your notes and marks are saved. Head back
              and open Books again.
            </Text>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[styles.emptyBack, { backgroundColor: palette.band }, palette.btnDress]}
            >
              <Text style={[styles.emptyBackText, { color: palette.raspDeep }]}>Go back</Text>
            </Pressable>
          </View>
        ) : null}
        </View>

        {/* v503: the filter bar, seated where the first section
            label sat — directly under the header cards, above
            the groups — and pinned by the scroll view's sticky
            index (child 1) so switching sections is always one
            tap away, however far down the list he has scrolled. */}
        <BooksFilterBar
          palette={palette}
          selected={chipSelection}
          onSelect={selectFilter}
          reduceMotion={reduceMotion}
        />

        {/* v503: the sections, inside the crossfade's one surface
            (Motion 3: the whole list moves as one — no per-card
            stagger). All renders the four groups with their
            labels exactly as before (v322: Written keeps its own
            section under Finished, same header treatment); a
            filter renders the one group with its label off, and
            a small breathing space stands where the label's
            rhythm was. */}
        <ReAnimated.View style={[listAnimStyle, sectionFilter === 'all' ? null : { paddingTop: 12 }]}>
          {filterSections.map((section) => (
            <View key={section.key}>
              {section.showLabel && section.books.length ? (
                <Text style={[styles.subhead, { color: palette.inkSoft }]}>{section.label}</Text>
              ) : null}
              {section.books.map(renderBookRow)}
            </View>
          ))}
        </ReAnimated.View>

        {/* v265: in the pane, the pane container carries the tab
            bar's clearance once — only the breathing room stays. */}
        <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
      </ScrollView>
      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          list dissolves under the Bible palette's paper at the top
          of the scroll view, below the fixed topbar. */}
      <TopFade color={palette.paper} scrollY={fadeScrollY} topInset={insets.top} />
      </View>

        {/* v422: the notes-source label editor that used to sit
            here is removed with the chip that opened it — it
            carried only the source label for the on-paper marks.
            The stored label itself stays in its store, dormant. */}

        {/* v305: the reset's one explicit confirmation — it names
            exactly what clears (every chapter's read mark) and what
            never does (notes, study queue, study states). */}
        <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
          <Pressable style={styles.scrim} onPress={() => setResetOpen(false)} />
          <View style={[styles.editorCard, { backgroundColor: palette.paper2 }, palette.sheetDress]}>
            <Text style={[styles.editorTitle, { color: palette.ink }]}>Reset reading progress?</Text>
            <Text style={[styles.editorSub, { color: palette.inkSoft }]}>
              Every chapter&rsquo;s read mark will clear, so you can start reading the Bible again from
              the beginning. Your notes, your study queue, and your chapters&rsquo; study states stay
              exactly as they are.
            </Text>
            <View style={styles.editorBtns}>
              <Pressable onPress={() => setResetOpen(false)}>
                <Text style={{ color: palette.inkSoft, fontWeight: '600', fontSize: 13.5 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editorSave, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={resetReading}
              >
                <Text style={styles.editorSaveText}>Reset reading</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        <Modal visible={bookNavOpen} transparent animationType="fade" onRequestClose={() => setBookNavOpen(false)}>
          <Pressable style={styles.scrim} onPress={() => setBookNavOpen(false)} />
          <View style={[styles.navCard, { backgroundColor: palette.paper2 }, palette.sheetDress]}>
            <View style={styles.navHead}>
              <Text style={[styles.editorTitle, { color: palette.ink }]}>Jump to Book</Text>
              <Pressable hitSlop={8} onPress={() => setBookNavOpen(false)} accessibilityRole="button" accessibilityLabel="Close book picker">
                <MaterialIcons name="close" size={18} color={palette.inkSoft} />
              </Pressable>
            </View>
            <Text style={[styles.editorSub, { color: palette.inkSoft }]}>
              Tap a book to open it — or mark the one you're studying Current, and the
              Personal Study card will read from there.
            </Text>
            <ScrollView style={{ marginTop: 10 }}>
              {CANON.map((book) => {
                const isCurrent = studyState?.currentBook === book;
                return (
                  <Pressable
                    key={book}
                    style={styles.navRow}
                    onPress={() => {
                      setBookNavOpen(false);
                      openBook(book);
                    }}
                  >
                    <Text style={[styles.navName, { color: palette.ink, fontWeight: isCurrent ? '800' : '600' }]} numberOfLines={1}>{book}</Text>
                    <CurrentPill book={book} studyState={studyState} onMakeCurrent={makeCurrent} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>

      {/* v259: same app, same bar — Study is the active slot.
          v265: in the pane there is no per-screen bar at all — the
          shell's one bar stands for the whole app. Route mode (a
          deep link's landing) keeps its bar. */}
      {inPane ? null : <BibleTabBar />}
    </View>
  );

  // v241: a render failure anywhere in this screen lands on the
  // Bible boundary's visible fallback — never on a blank page.
  const guarded = <BibleScreenBoundary>{content}</BibleScreenBoundary>;
  // v246: screenRoot — a whole screen's paint is never gated on
  // the settle's fade (see components/paper-motion.tsx).
  if (skin === 'paper') return <PaperSettle screenRoot>{guarded}</PaperSettle>;
  if (skin === '8bit') return <BitSettle screenRoot>{guarded}</BitSettle>;
  return guarded;
}

/** v211: the Current pill. The book he is studying shows a filled
 * Current marker; every other unfinished book offers a tappable pill
 * that makes it current (writing the study store — see makeCurrent).
 * A finished book needs no pill: there is nothing left to read from
 * there.
 * v383: the offer pill's dress changes — it wore palette.band, a
 * quarter-strength seed wash that in his dark theme renders as a
 * solid-looking blue pill with light text, indistinguishable from
 * the filled chip (his Oct 31 screenshot: Colossians' and Leviticus'
 * pills read identical, so two books looked "current" while the
 * book he had actually marked sat elsewhere). The offer is now a
 * quiet tonal pill — raspTint with a hairline bandBorder — and it
 * speaks as an action, "Set current", never as the state word. The
 * filled chip (solid rasp, white CURRENT) is the only pill that
 * states a fact. */
function CurrentPill({
  book,
  studyState,
  onMakeCurrent,
}: {
  book: string;
  studyState: StudyState | null;
  onMakeCurrent: (book: string) => void;
}) {
  // v420: the pill sits on a book's own row (or its Jump-to-Book
  // row), so it wears that book's ROYGBIV colour — the filled chip
  // is the book's primary, the offer its pill tint + deep.
  const palette = useBookBiblePalette(book);
  if (!studyState) return null;
  if (studyState.currentBook === book) {
    return (
      <View style={[styles.currentPill, { backgroundColor: palette.rasp }]} accessibilityLabel={`${book} is the current book`}>
        <Text style={[styles.currentPillText, { color: '#FFFFFF' }]}>Current</Text>
      </View>
    );
  }
  if (bookIsComplete(studyState, book)) return null;
  return (
    <Pressable
      style={[styles.currentPill, { backgroundColor: palette.raspTint, borderColor: palette.bandBorder, borderWidth: 1 }]}
      accessibilityRole="button"
      accessibilityLabel={`Make ${book} current`}
      hitSlop={6}
      onPress={() => onMakeCurrent(book)}
    >
      <Text style={[styles.currentPillText, { color: palette.raspDeep }]}>Set current</Text>
    </Pressable>
  );
}

/** v424: the Restudy queue card — the queue's one home on the
 * Books page (his pick: Concept 2 of
 * restudy-reading-concepts-v1.html, with "make it material design
 * though"). A filled Material TONAL card: its ground is the page
 * palette's primary container (palette.primCont — derived from
 * his seed × light/dark like every surface here, never pinned),
 * radius 24 in the register of the schedule's Up Next card, and
 * NO shadow — tonal layering does the lifting. Leading: the
 * restudy glyph the app already speaks (the chapter panel's
 * "↻ ReStudy" mark, blocks.tsx STATUS_LABEL) in a circular
 * primary container, white on palette.rasp exactly as the filled
 * Current chip dresses. Title in the page's title weight; the
 * supporting line (the summary's own wording, rewards.ts
 * restudyQueueSummary) in the soft ink; a chevron in the same
 * soft ink closes the row. The whole card is one tap target into
 * the Study Queue — the same openQueue door the topbar button
 * uses. It renders only while the queue is non-empty. */
function RestudyQueueCard({
  summary,
  palette,
  onPress,
}: {
  summary: RestudyQueueSummary;
  palette: BiblePalette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Restudy queue. ${summary.line}. Open the Study Queue.`}
      style={[styles.queueCard, { backgroundColor: palette.primCont }]}
    >
      <View style={[styles.queueIcon, { backgroundColor: palette.rasp }]}>
        <Text style={styles.queueGlyph}>↻</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.queueTitle, { color: palette.ink }]}>Restudy queue</Text>
        <Text style={[styles.queueLine, { color: palette.inkSoft }]}>{summary.line}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={palette.inkSoft} />
    </Pressable>
  );
}

/** v502: the Downloaded audio card — the Restudy card's sibling
 * (his ruling on the drawing: the audio box wears a TINT the way
 * the Restudy box does). Same anatomy, same seat rhythm, same
 * styles: a filled tonal card at radius 24, NO outline and NO
 * shadow; a circular disc; title + one summary line; a chevron.
 * What differs is whose colours fill it: the ground is the newest
 * download's book primary container and the disc its primary
 * (the v420 book palette — Hebrews' violet today), while title,
 * line and chevron keep the page ink, exactly as the Restudy
 * card's do. The glyph is the download arrow — the app's own
 * file-download mark, the same one the book page's Download
 * button carries. It renders only while the model is visible
 * (a download verified on disk). */
function DownloadedAudioCard({
  model,
  book,
  palette,
  onPress,
}: {
  model: DownloadsCardModel;
  book: string;
  palette: BiblePalette;
  onPress: () => void;
}) {
  const bookPal = useBookBiblePalette(book);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Downloaded audio. ${model.line}. Open the downloads.`}
      style={[styles.queueCard, { backgroundColor: bookPal.primCont }]}
    >
      <View style={[styles.queueIcon, { backgroundColor: bookPal.rasp }]}>
        <MaterialIcons name="file-download" size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.queueTitle, { color: palette.ink }]}>Downloaded audio</Text>
        <Text style={[styles.queueLine, { color: palette.inkSoft }]}>{model.line}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={palette.inkSoft} />
    </Pressable>
  );
}

function BookRow({
  book,
  studyState,
  palette,
  notesCount,
  imports,
  onPress,
  onMakeCurrent,
}: {
  book: string;
  studyState: StudyState | null;
  palette: BiblePalette;
  /** Chapters carrying his commentary — the signal the old "Chapter
   * notes" section used to carry, now on the row itself. */
  notesCount: number;
  /** v324: the studio imports the written count resolves against. */
  imports: StudioImportsMap;
  onPress: () => void;
  onMakeCurrent: (book: string) => void;
}) {
  // v420: the row's own accents — chevron, both threads, the
  // Current pill — wear the book's ROYGBIV colour; the card, name
  // and counts keep the page palette.
  const bookPal = useBookBiblePalette(book);
  // v206: counts run over the book's full chapter count — the v205
  // CSV "tracked subset" (Psalms 40) is gone.
  // v324: the WRITTEN count is the union rule (rewards.ts
  // chapterIsWritten): a chapter counts when its stored status is
  // Complete OR the resolved chapter data (shipped + imports)
  // carries his notes — the same rule that seats the book in the
  // Written section, so the countline and the section never
  // disagree.
  // v325: every tally on this row comes from the one shared ledger
  // (rewards.ts bookChapterTallies): "to write" is the RESIDUAL
  // (total - written), never the count of Write-next stamps, and
  // the in-progress / not-started tallies skip chapters the union
  // rule already counts as written. The thread's in-progress
  // segment uses the same non-double-counted figure, so the words
  // and the bar finally agree.
  const tallies = bookChapterTallies(studyState ?? seedStudyState(), book, imports);
  const total = tallies.total;
  const writtenCount = tallies.written;
  const toWrite = tallies.toWrite;
  const prog = tallies.inProgress;
  const notStarted = tallies.notStarted;
  const pct = total ? Math.round((100 * writtenCount) / total) : 0;
  const ppct = total ? Math.round((100 * prog) / total) : 0;
  // v305: the READING count — the v228 read track, counted on its
  // own (lib/bible-v205/reading-progress), never derived from the
  // study counts above: Leviticus can read 0 complete here while
  // its reading thread fills.
  const readCount = studyState ? bookReadCount(studyState, book) : 0;
  const parts: string[] = [];
  // v313: the drawing's counts word — "0 of 27 written", his word
  // for the writing track everywhere in the approved drawing.
  parts.push(`${writtenCount} of ${total} written`);
  if (toWrite) parts.push(`${toWrite} to write`);
  if (prog) parts.push(total === prog ? `all ${prog} in progress` : `${prog} in progress`);
  if (notStarted && writtenCount === 0 && !prog) parts.push('not started');
  if (notesCount) parts.push(`notes in ${notesCount} ${notesCount === 1 ? 'chapter' : 'chapters'}`);

  return (
    <Pressable
      style={[styles.bookrow, { backgroundColor: palette.paper2 }, palette.cardDress, { borderRadius: 16 }]}
      onPress={onPress}
    >
      {/* v311: the name takes its OWN line at 22px and never
          truncates — it wraps if it must; the counts line sits
          beneath it in full (the v251 shrink arrangement that
          clipped "Hebrew…" and ellipsized the counts is retired).
          The Current pill rides the name row's right edge. */}
      <View style={styles.bnameRow}>
        <Text style={[styles.bname, { color: palette.ink }]}>
          {book} <Text style={{ color: bookPal.rasp }}>›</Text>
        </Text>
        <CurrentPill book={book} studyState={studyState} onMakeCurrent={onMakeCurrent} />
      </View>
      <Text style={[styles.bcount, { color: palette.inkSoft }]}>
        <Text style={[styles.bcountLead, { color: palette.ink }]}>{parts[0]}</Text>
        {parts.length > 1 ? ` · ${parts.slice(1).join(' · ')}` : ''}
      </Text>
      {/* v342 (his ruling, Oct 29 14:46, on the Books screenshot:
          "all the lines below the top ones can be straight"): the
          per-book written thread is a RECORD bar, so v341's wavy
          conversion is reverted — its pre-v341 straight form,
          written in the seed on the tint track with the
          in-progress share riding behind it in yellow. The Study
          header's two threads at the top of the page stay wavy. */}
      <View style={[styles.thread, { backgroundColor: bookPal.raspTint }]}>
        <View style={[styles.threadFill, { backgroundColor: bookPal.rasp, width: `${pct}%` }]} />
        {ppct ? (
          <View
            style={[styles.threadFill, { backgroundColor: palette.yellowBorder, width: `${ppct}%`, marginLeft: `${pct}%`, position: 'absolute', left: 0 }]}
          />
        ) : null}
      </View>
      {/* v305: the reading thread — slimmer and deeper than the
          study thread above it, with its own count. */}
      <View style={{ marginTop: 8 }}>
        <BookReadingThread read={readCount} total={total} palette={bookPal} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  // v250: topbar actions are tonal pills, not outlines.
  queueBtn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  queueBtnText: { fontSize: 13, fontWeight: '600' },
  page: { paddingHorizontal: 16, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '700', textAlign: 'center' },
  h2: { fontSize: 34, fontWeight: '700', letterSpacing: -0.6, marginTop: 8, textAlign: 'center' },
  vsub: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 14, paddingHorizontal: 6 },
  subhead: { fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', paddingTop: 26, paddingBottom: 12 },
  emptyGuard: { alignItems: 'center', paddingTop: 34, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  emptyBack: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18, marginTop: 18 },
  emptyBackText: { fontSize: 13, fontWeight: '800' },
  // v311: the drawing's book card measure — radius 16 (applied over
  // cardDress at the row), 18px padding, 12px between rows. v313:
  // the drawing's internal rhythm — counts 4 under the name, the
  // writing bar 16 under the counts, the reading bar 8 under it
  // (margins on the children, no uniform gap).
  bookrow: { paddingVertical: 18, paddingHorizontal: 18, marginBottom: 12 },
  bnameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // v311: the name at 22/700 on its own line — flex 1 and NO
  // numberOfLines, so it wraps whole instead of truncating.
  bname: { fontSize: 22, fontWeight: '700', flex: 1 },
  bcount: { fontSize: 13.5, lineHeight: 19, fontWeight: '500', marginTop: 4 },
  bcountLead: { fontWeight: '700' },
  // v424: the Restudy queue card (Concept 2, Material): a row at
  // radius 24 — circular icon container, title + line, chevron —
  // seated under the progress header with the sections' rhythm.
  queueCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 24, paddingVertical: 15, paddingHorizontal: 18, marginTop: 14 },
  queueIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  queueGlyph: { fontSize: 19, fontWeight: '700', color: '#FFFFFF', lineHeight: 22 },
  queueTitle: { fontSize: 16, fontWeight: '700' },
  queueLine: { fontSize: 13.5, lineHeight: 19, fontWeight: '500', marginTop: 2 },
  thread: { height: 8, borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 16 },
  threadFill: { height: 8, borderRadius: 999 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  editorCard: { position: 'absolute', left: 20, right: 20, top: '30%', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  editorTitle: { fontSize: 16, fontWeight: '800' },
  editorSub: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  editorBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16 },
  editorSave: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  editorSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  // v251: the chip NEVER shrinks — it keeps its full width inside
  // the card; the texts beside it do the shrinking.
  currentPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, flexShrink: 0 },
  currentPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  navCard: { position: 'absolute', left: 20, right: 20, top: '9%', maxHeight: '80%', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  navHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9 },
  navName: { fontSize: 15, flexShrink: 1 },
});
