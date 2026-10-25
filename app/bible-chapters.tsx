// ─── v205 Books view ─────────────────────────────────────────────────────────
// v206 reframe (his ruling — only app progress counts): the groups were
// progress books, "Chapter notes", handwritten-only rows, and the quiet
// rest of the canon. v222 replaces all four with THREE sections over
// ALL 66 books, from the study store alone: Current (his currentBook
// first, then every other book with any state, not finished), Finished
// (every chapter Complete), Not Started (no chapter states). A book
// with notes but no states lands in Not Started with its notes count on
// the row — notes no longer earn a book its own section.

import { useCallback, useEffect, useState } from 'react';
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
import type { StudyStatus } from '@/lib/bible-v205/types';
import {
  chapterStatus,
  loadStudyState,
  saveStudyState,
  seedStudyState,
  setCurrentBook as setStudyCurrentBook,
  type StudyState,
} from '@/lib/bible-v205/study';
import { bookIsComplete, groupBooksByStudy } from '@/lib/bible-v205/rewards';
import { Ornament, StatusChip } from '@/components/bible-v205/blocks';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
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

const CANON = Object.keys(CHAPTER_COUNTS);

export default function BibleBooksScreen() {
  const router = useRouter();
  // v211: the Personal Study card's Books button lands here with
  // openBookNav=1 — open the Jump to Book sheet on arrival. The sheet
  // is also one tap from the topbar.
  const params = useLocalSearchParams<{ openBookNav?: string }>();
  const [bookNavOpen, setBookNavOpen] = useState(false);
  useEffect(() => {
    if (params.openBookNav === '1') setBookNavOpen(true);
  }, [params.openBookNav]);
  // v207: the top safe-area inset the rest of the app applies — without
  // it the topbar slides up under the Android notification tray.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [labels, setLabels] = useState<UserLabels | null>(null);
  const [handwritten, setHandwritten] = useState<HandwrittenEntry[]>([]);
  const [labelEditor, setLabelEditor] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadStudyState().then((s) => live && setStudyState(s));
      loadUserLabels().then((l) => live && setLabels(l));
      loadHandwritten().then((h) => live && setHandwritten(h));
      return () => {
        live = false;
      };
    }, []),
  );

  // v222: all 66 books, three sections, from the study store alone.
  // Before the store loads, the seed state puts every book in Not
  // Started, so the list is complete from the first paint.
  const effectiveState = studyState ?? seedStudyState();
  const groups = groupBooksByStudy(effectiveState, CANON);
  // v241: the canon is 66 books — a grouping with zero books across
  // all three sections is impossible in a healthy build, so it gets a
  // visible word (below) instead of an empty page.
  const totalBooks = groups.current.length + groups.finished.length + groups.notStarted.length;
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
      onPress={() => openBook(book)}
      onMakeCurrent={makeCurrent}
    />
  );

  const openBook = (book: string) => router.push({ pathname: '/bible-book', params: { book } });

  // v211: "mark it as current" is back — and it writes the NEW study
  // store (the position the Personal Study card reads), not the legacy
  // unified store the pre-v205 pill wrote.
  const makeCurrent = async (book: string) => {
    const fresh = await loadStudyState();
    const next = setStudyCurrentBook(fresh, book);
    await saveStudyState(next);
    setStudyState(next);
  };

  const content = (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 2 }}>
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
          onPress={() => router.push('/bible-queue')}
          style={[styles.queueBtn, { backgroundColor: palette.band }, palette.btnDress]}
        >
          <Text style={[styles.queueBtnText, { color: palette.raspDeep }]}>Study Queue</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }, palette.h2Size != null ? { fontSize: palette.h2Size } : null]}>{possessive} Books</Text>
          <Ornament palette={palette} />
          <Text style={[styles.vsub, { color: palette.inkSoft }]}>
            The states you set in the app, and the books your notes live in — nothing here is marked for you.
            The ✎ marks books that also live in handwriting.
          </Text>
        </View>

        <View style={styles.legend}>
          {(['complete', 'in-progress', 'write', 'restudy', 'none'] as StudyStatus[]).map((s) => (
            <StatusChip key={s} status={s} palette={palette} />
          ))}
          {/* v222: the notes-source label editor lost its old home (the
              Handwritten-only header) when the sections merged — it
              lives on the ✎ chip now. */}
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
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[styles.emptyBack, { backgroundColor: palette.band }, palette.btnDress]}
            >
              <Text style={[styles.emptyBackText, { color: palette.raspDeep }]}>Go back</Text>
            </Pressable>
          </View>
        ) : null}

        {groups.current.length ? (
          <Text style={[styles.subhead, { color: palette.rasp }]}>Current</Text>
        ) : null}
        {groups.current.map(renderBookRow)}

        {groups.finished.length ? (
          <Text style={[styles.subhead, { color: palette.rasp }]}>Finished</Text>
        ) : null}
        {groups.finished.map(renderBookRow)}

        {groups.notStarted.length ? (
          <Text style={[styles.subhead, { color: palette.rasp }]}>Not Started</Text>
        ) : null}
        {groups.notStarted.map(renderBookRow)}

        <View style={{ height: 30 }} />
      </ScrollView>

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
                    <Text style={[styles.navName, { color: palette.ink, fontWeight: isCurrent ? '800' : '600' }]}>{book}</Text>
                    <CurrentPill book={book} studyState={studyState} palette={palette} onMakeCurrent={makeCurrent} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Modal>
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
  onPress: () => void;
  onMakeCurrent: (book: string) => void;
}) {
  // v206: counts run over the book's full chapter count, from app
  // states only — the v205 CSV "tracked subset" (Psalms 40) is gone.
  const total = CHAPTER_COUNTS[book] ?? 0;
  let complete = 0;
  let prog = 0;
  let write = 0;
  let notStarted = 0;
  if (studyState) {
    for (let c = 1; c <= total; c++) {
      const s = chapterStatus(studyState, book, c);
      if (s === 'complete') complete++;
      else if (s === 'in-progress') prog++;
      else if (s === 'write') write++;
      else if (s === 'not-started') notStarted++;
    }
  }
  const pct = total ? Math.round((100 * complete) / total) : 0;
  const ppct = total ? Math.round((100 * prog) / total) : 0;
  const paper = paperNote ? `handwritten notes, ${paperNote}` : null;
  const parts: string[] = [];
  parts.push(`${complete} of ${total} complete`);
  if (write) parts.push(`${write} to write`);
  if (prog) parts.push(total === prog ? `all ${prog} in progress` : `${prog} in progress`);
  if (notStarted && complete === 0 && !write && !prog) parts.push('not started');
  if (notesCount) parts.push(`notes in ${notesCount} ${notesCount === 1 ? 'chapter' : 'chapters'}`);
  if (paper) parts.push(paper);

  return (
    <Pressable style={[styles.bookrow, { backgroundColor: palette.paper2 }, palette.cardDress]} onPress={onPress}>
      <View style={styles.btop}>
        <Text style={[styles.bname, { color: palette.ink }]}>
          {book} <Text style={{ color: palette.rasp }}>›</Text>
          {paperNote ? <Text style={[styles.papermark, { color: palette.inkSoft }]}>  ✎ on paper</Text> : null}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.bcount, { color: palette.inkSoft }]}>{parts.join(' · ')}</Text>
          <CurrentPill book={book} studyState={studyState} palette={palette} onMakeCurrent={onMakeCurrent} />
        </View>
      </View>
      <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
        <View style={[styles.threadFill, { backgroundColor: palette.rasp, width: `${pct}%` }]} />
        {ppct ? (
          <View
            style={[styles.threadFill, { backgroundColor: palette.yellowBorder, width: `${ppct}%`, marginLeft: `${pct}%`, position: 'absolute', left: 0 }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 14.5, fontWeight: '800', flex: 1 },
  // v250: topbar actions are tonal pills, not outlines.
  queueBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  queueBtnText: { fontSize: 12, fontWeight: '800' },
  page: { paddingHorizontal: 18, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  h2: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8, textAlign: 'center' },
  vsub: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 14, paddingHorizontal: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 },
  chip: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  subhead: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', paddingTop: 24, paddingBottom: 4 },
  emptyGuard: { alignItems: 'center', paddingTop: 34, paddingHorizontal: 8 },
  emptyTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  emptyBody: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 10 },
  emptyBack: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 18, marginTop: 18 },
  emptyBackText: { fontSize: 13, fontWeight: '800' },
  // v250: a book is a card now — raised surface, big radius, the
  // 9px seed progress thread inside it.
  bookrow: { borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  btop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  bname: { fontSize: 16, fontWeight: '700' },
  papermark: { fontSize: 11, fontWeight: '600' },
  bcount: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
  thread: { height: 9, borderRadius: 999, overflow: 'hidden', position: 'relative' },
  threadFill: { height: 9, borderRadius: 999 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  editorCard: { position: 'absolute', left: 20, right: 20, top: '30%', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  editorTitle: { fontSize: 16, fontWeight: '800' },
  editorSub: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  editorInput: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, marginTop: 14 },
  editorBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16 },
  editorSave: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  editorSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  currentPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 },
  currentPillText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  navCard: { position: 'absolute', left: 20, right: 20, top: '9%', maxHeight: '80%', borderRadius: 28, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  navHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 9 },
  navName: { fontSize: 15 },
});
