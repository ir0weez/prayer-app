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
// groupBooksByStudy; this screen only renders its four sections.
// v324 (his words, 2026-10-28 21:00 — "I have multiple entire books
// finished with notes"): Written membership and the rows' written
// counts now follow the union rule (rewards.ts chapterIsWritten —
// stored Complete OR notes in the resolved data, studio imports
// included). The screen loads the imports map on focus and hands
// it to both the grouping and every row, so the count a row prints
// and the section it sits in are the same fact.
// v325: the v305 overall reading card is replaced by the approved
// progress header (study-progress-concepts-v3.html, Concept 3 —
// Two Structured Rows): both tracks, their book counts and their
// remainders in one radius-24 card, with the reset line under it
// (the reset itself is unchanged — it still clears only reads).
// The rows' tallies all come from rewards.ts bookChapterTallies,
// whose written + toWrite = chapter count invariant retires the
// "1 of 4 written · 4 to write" double count.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
  studyProgressTotals,
} from '@/lib/bible-v205/rewards';
import {
  loadStudioImports,
  type StudioImportsMap,
} from '@/lib/bible-v205/studio-import';
import {
  bookReadCount,
  resetReadingProgress,
} from '@/lib/bible-v205/reading-progress';
import { BookReadingThread, StudyProgressHeader } from '@/components/bible-v205/reading-progress-card';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';
import { useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
import { TopFade, topFadeScrollHandler, useTopFadeScrollY } from '@/components/top-fade';
import {
  handwrittenNoteFor,
  loadHandwritten,
  type HandwrittenEntry,
} from '@/lib/bible-v205/handwritten';
import {
  loadUserLabels,
  saveSourceLabel,
  type UserLabels,
} from '@/lib/bible-v205/user-labels';
import { bibleShellParamsForRoute, type BiblePaneNav } from '@/lib/bible-pane';

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
      setLabelEditor(false);
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
  const [handwritten, setHandwritten] = useState<HandwrittenEntry[]>([]);
  const [labelEditor, setLabelEditor] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
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

  // v263: labels and handwritten coverage load ONCE, on mount.
  // They only ever change on this screen (the notes-source label
  // editor lives here and updates its own state as it saves), so
  // re-reading them on every focus was pure cost on the tab-switch
  // path: three storage loads and up to three full 66-row
  // re-renders landed inside the switch's first frames every time
  // he hopped People → Study. A refocus now costs one load and one
  // re-render, and unrelated re-renders (the sheets opening) reuse
  // the memoized grouping below.
  useEffect(() => {
    let live = true;
    loadUserLabels().then((l) => live && setLabels(l));
    loadHandwritten().then((h) => live && setHandwritten(h));
    return () => {
      live = false;
    };
  }, []);

  // v222: all 66 books, from the study store alone. v322: FOUR
  // sections — Finished (fully read) and Written (fully written)
  // split by channel, then Current and Not Started. v324: Written
  // also reads the resolved notes data (imports included), so the
  // fully-noted books seat there from the first paint — the seed
  // state no longer puts every book in Not Started.
  const effectiveState = studyState ?? seedStudyState();
  const groups = useMemo(
    () => groupBooksByStudy(effectiveState, CANON, studioImports),
    [effectiveState, studioImports],
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
  const sourceLabel = labels?.sourceLabel ?? 'Handwritten notes';

  // The ✎ on-paper marker for a row: the shipped handwritten coverage
  // (non-only entries) or, for a handwritten-only book, its range.
  const paperNoteFor = (book: string): string | null => {
    const note = handwrittenNoteFor(handwritten, book);
    if (note) return note;
    const only = handwritten.find((e) => e.book === book && e.only);
    return only ? `${only.from}–${only.to}` : null;
  };

  const renderBookRow = (book: string) => (
    <BookRow
      key={book}
      book={book}
      studyState={effectiveState}
      palette={palette}
      paperNote={paperNoteFor(book)}
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
  const resetReading = async () => {
    const fresh = await loadStudyState();
    const next = resetReadingProgress(fresh);
    await saveStudyState(next);
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} onScroll={topFadeScrollHandler(fadeScrollY)} scrollEventThrottle={16}>
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

        {/* v311: the legend is reduced to the drawing's quiet form —
            no status chips at all. Only the ✎ door stays: it is not
            a legend entry but the notes-source label editor's home
            (v222), and it keeps its words. */}
        <View style={styles.legend}>
          <Pressable
            style={[styles.chip, { backgroundColor: palette.band }]}
            accessibilityLabel="Name your notes source"
            onPress={() => {
              setLabelDraft(sourceLabel);
              setLabelEditor(true);
            }}
          >
            <Text style={[styles.chipText, { color: palette.inkSoft }]}>✎ On paper</Text>
          </Pressable>
        </View>

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

        {groups.current.length ? (
          <Text style={[styles.subhead, { color: palette.inkSoft }]}>Current</Text>
        ) : null}
        {groups.current.map(renderBookRow)}

        {groups.finished.length ? (
          <Text style={[styles.subhead, { color: palette.inkSoft }]}>Finished</Text>
        ) : null}
        {groups.finished.map(renderBookRow)}

        {/* v322: writing-complete books keep a section of their
            own, right under Finished — same header treatment. */}
        {groups.written.length ? (
          <Text style={[styles.subhead, { color: palette.inkSoft }]}>Written</Text>
        ) : null}
        {groups.written.map(renderBookRow)}

        {groups.notStarted.length ? (
          <Text style={[styles.subhead, { color: palette.inkSoft }]}>Not Started</Text>
        ) : null}
        {groups.notStarted.map(renderBookRow)}

        {/* v265: in the pane, the pane container carries the tab
            bar's clearance once — only the breathing room stays. */}
        <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
      </ScrollView>
      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          list dissolves under the Bible palette's paper at the top
          of the scroll view, below the fixed topbar. */}
      <TopFade color={palette.paper} scrollY={fadeScrollY} topInset={insets.top} />
      </View>

        <Modal visible={labelEditor} transparent animationType="fade" onRequestClose={() => setLabelEditor(false)}>
          <Pressable style={styles.scrim} onPress={() => setLabelEditor(false)} />
          <View style={[styles.editorCard, { backgroundColor: palette.paper2 }, palette.sheetDress]}>
            <Text style={[styles.editorTitle, { color: palette.ink }]}>Name your notes source</Text>
            <Text style={[styles.editorSub, { color: palette.inkSoft }]}>
              Where your handwritten notes live — a reMarkable, a notebook, anything. However you want to put it.
            </Text>
            <TextInput
              style={[styles.editorInput, { borderColor: palette.lineDark, color: palette.ink, backgroundColor: palette.paper2 }]}
              value={labelDraft}
              onChangeText={setLabelDraft}
              placeholder="Handwritten notes"
              placeholderTextColor={palette.inkFaint}
              autoFocus
            />
            <View style={styles.editorBtns}>
              <Pressable onPress={() => setLabelEditor(false)}>
                <Text style={{ color: palette.inkSoft, fontWeight: '600', fontSize: 13.5 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.editorSave, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={async () => {
                  const saved = await saveSourceLabel(labelDraft);
                  setLabels((l) => (l ? { ...l, sourceLabel: saved } : l));
                  setLabelEditor(false);
                }}
              >
                <Text style={styles.editorSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

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
                    <CurrentPill book={book} studyState={studyState} palette={palette} onMakeCurrent={makeCurrent} />
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
 * there. */
function CurrentPill({
  book,
  studyState,
  palette,
  onMakeCurrent,
}: {
  book: string;
  studyState: StudyState | null;
  palette: BiblePalette;
  onMakeCurrent: (book: string) => void;
}) {
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
      style={[styles.currentPill, { backgroundColor: palette.band }]}
      accessibilityRole="button"
      accessibilityLabel={`Make ${book} current`}
      hitSlop={6}
      onPress={() => onMakeCurrent(book)}
    >
      <Text style={[styles.currentPillText, { color: palette.raspDeep }]}>Current</Text>
    </Pressable>
  );
}

function BookRow({
  book,
  studyState,
  palette,
  paperNote,
  notesCount,
  imports,
  onPress,
  onMakeCurrent,
}: {
  book: string;
  studyState: StudyState | null;
  palette: BiblePalette;
  paperNote: string | null;
  /** Chapters carrying his commentary — the signal the old "Chapter
   * notes" section used to carry, now on the row itself. */
  notesCount: number;
  /** v324: the studio imports the written count resolves against. */
  imports: StudioImportsMap;
  onPress: () => void;
  onMakeCurrent: (book: string) => void;
}) {
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
  const paper = paperNote ? `handwritten notes, ${paperNote}` : null;
  const parts: string[] = [];
  // v313: the drawing's counts word — "0 of 27 written", his word
  // for the writing track everywhere in the approved drawing.
  parts.push(`${writtenCount} of ${total} written`);
  if (toWrite) parts.push(`${toWrite} to write`);
  if (prog) parts.push(total === prog ? `all ${prog} in progress` : `${prog} in progress`);
  if (notStarted && writtenCount === 0 && !prog) parts.push('not started');
  if (notesCount) parts.push(`notes in ${notesCount} ${notesCount === 1 ? 'chapter' : 'chapters'}`);
  if (paper) parts.push(paper);

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
          {book} <Text style={{ color: palette.rasp }}>›</Text>
          {paperNote ? <Text style={[styles.papermark, { color: palette.inkSoft }]}>  ✎ on paper</Text> : null}
        </Text>
        <CurrentPill book={book} studyState={studyState} palette={palette} onMakeCurrent={onMakeCurrent} />
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
      <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
        <View style={[styles.threadFill, { backgroundColor: palette.rasp, width: `${pct}%` }]} />
        {ppct ? (
          <View
            style={[styles.threadFill, { backgroundColor: palette.yellowBorder, width: `${ppct}%`, marginLeft: `${pct}%`, position: 'absolute', left: 0 }]}
          />
        ) : null}
      </View>
      {/* v305: the reading thread — slimmer and deeper than the
          study thread above it, with its own count. */}
      <View style={{ marginTop: 8 }}>
        <BookReadingThread read={readCount} total={total} palette={palette} />
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
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 },
  chip: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
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
  papermark: { fontSize: 12.5, fontWeight: '600' },
  bcount: { fontSize: 13.5, lineHeight: 19, fontWeight: '500', marginTop: 4 },
  bcountLead: { fontWeight: '700' },
  thread: { height: 8, borderRadius: 999, overflow: 'hidden', position: 'relative', marginTop: 16 },
  threadFill: { height: 8, borderRadius: 999 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  editorCard: { position: 'absolute', left: 20, right: 20, top: '30%', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  editorTitle: { fontSize: 16, fontWeight: '800' },
  editorSub: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  editorInput: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, marginTop: 14 },
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
