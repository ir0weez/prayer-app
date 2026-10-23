// ─── v205 Books view ─────────────────────────────────────────────────────────
// "His Books": every book his study databases know, in his own status
// words — progress threads from the real chapter states, the notes-only
// books, the handwritten-only row, and the quiet rest of the canon. This
// route also serves the older bible navigation entry points (profile,
// schedule tab) — it is the Bible home now.

import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import {
  CHAPTER_COUNTS,
  databaseBooks,
  notesBooks,
  notesChapterCount,
} from '@/lib/bible-v205/index';
import type { StudyStatus } from '@/lib/bible-v205/types';
import {
  chapterStatus,
  loadStudyState,
  type StudyState,
} from '@/lib/bible-v205/study';
import { Ornament, StatusChip } from '@/components/bible-v205/blocks';
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

  const dbBooks = databaseBooks(CANON);
  const notesOnly = notesBooks(CANON).filter((b) => !dbBooks.includes(b));
  const paperOnly = handwritten.filter((e) => e.only);
  const covered = new Set([...dbBooks, ...notesOnly, ...paperOnly.map((e) => e.book)]);
  const quiet = CANON.filter((b) => !covered.has(b));
  const possessive = labels?.possessive ?? 'Your';
  const possessiveLower = labels?.possessiveLower ?? 'your';
  const sourceLabel = labels?.sourceLabel ?? 'Handwritten notes';

  const openBook = (book: string) => router.push({ pathname: '/bible-book', params: { book } });

  const content = (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={[styles.topbar, { borderBottomColor: palette.line }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>Bible</Text>
        <Pressable
          onPress={() => router.push('/bible-queue')}
          style={[styles.queueBtn, { borderColor: palette.rasp }]}
        >
          <Text style={[styles.queueBtnText, { color: palette.raspDeep }]}>Study Queue</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }]}>{possessive} Books</Text>
          <Ornament palette={palette} />
          <Text style={[styles.vsub, { color: palette.inkSoft }]}>
            Every book the study databases know — and the true state of its chapters, in the status words they were
            recorded in. The ✎ marks books that also live in handwriting.
          </Text>
        </View>

        <View style={styles.legend}>
          {(['complete', 'in-progress', 'write', 'restudy', 'none'] as StudyStatus[]).map((s) => (
            <StatusChip key={s} status={s} palette={palette} />
          ))}
          <View style={[styles.chip, { backgroundColor: palette.paper, borderColor: palette.lineDark }]}>
            <Text style={[styles.chipText, { color: palette.inkSoft }]}>✎ On paper</Text>
          </View>
        </View>

        {dbBooks.length ? (
          <Text style={[styles.subhead, { color: palette.rasp }]}>In {possessiveLower} databases</Text>
        ) : null}
        {dbBooks.map((book) => (
          <BookRow
            key={book}
            book={book}
            studyState={studyState}
            palette={palette}
            paperNote={handwrittenNoteFor(handwritten, book)}
            onPress={() => openBook(book)}
          />
        ))}

        {notesOnly.length ? (
          <Text style={[styles.subhead, { color: palette.rasp }]}>Chapter notes — no status list</Text>
        ) : null}
        {notesOnly.map((book) => {
          const n = notesChapterCount(book);
          return (
            <Pressable key={book} style={styles.bookrow} onPress={() => openBook(book)}>
              <View style={styles.btop}>
                <Text style={[styles.bname, { color: palette.ink }]}>
                  {book} <Text style={{ color: palette.rasp }}>›</Text>
                </Text>
                <Text style={[styles.bcount, { color: palette.inkSoft }]}>
                  Chapter notes · {n} {n === 1 ? 'chapter' : 'chapters'}
                </Text>
              </View>
              <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
                <View style={[styles.threadFill, { backgroundColor: '#F3CFE0', width: '100%' }]} />
              </View>
            </Pressable>
          );
        })}

        {paperOnly.length ? (
          <View style={styles.subheadRow}>
            <Text style={[styles.subhead, { color: palette.rasp, paddingTop: 0 }]}>
              Handwritten only — on {possessiveLower} {sourceLabel}
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => {
                setLabelDraft(sourceLabel);
                setLabelEditor(true);
              }}
            >
              <MaterialIcons name="edit" size={14} color={palette.inkSoft} />
            </Pressable>
          </View>
        ) : null}
        {paperOnly.map((entry) => {
          const total = CHAPTER_COUNTS[entry.book] ?? entry.to;
          return (
            <Pressable key={entry.book} style={styles.bookrow} onPress={() => openBook(entry.book)}>
              <View style={styles.btop}>
                <Text style={[styles.bname, { color: palette.ink }]}>
                  {entry.book} <Text style={[styles.papermark, { color: palette.inkSoft }]}>✎ on paper</Text>
                </Text>
                <Text style={[styles.bcount, { color: palette.inkSoft }]}>
                  Handwritten notes · chapters {entry.from}–{entry.to} of {total}
                </Text>
              </View>
              <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
                <View
                  style={[styles.threadFill, { backgroundColor: '#F3CFE0', width: `${Math.round((100 * entry.to) / total)}%` }]}
                />
              </View>
            </Pressable>
          );
        })}

        <Modal visible={labelEditor} transparent animationType="fade" onRequestClose={() => setLabelEditor(false)}>
          <Pressable style={styles.scrim} onPress={() => setLabelEditor(false)} />
          <View style={[styles.editorCard, { backgroundColor: palette.paper }]}>
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
                style={[styles.editorSave, { backgroundColor: palette.rasp }]}
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

        <Text style={[styles.subhead, { color: palette.rasp }]}>The rest of the canon</Text>
        <Text style={[styles.canonQuiet, { color: palette.inkFaint }]}>
          {quiet.join(' · ')} — they read as plain chapters, with nothing marked, until your notes reach them.
        </Text>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );

  if (skin === 'paper') return <PaperSettle>{content}</PaperSettle>;
  if (skin === '8bit') return <BitSettle>{content}</BitSettle>;
  return content;
}

function BookRow({
  book,
  studyState,
  palette,
  paperNote,
  onPress,
}: {
  book: string;
  studyState: StudyState | null;
  palette: BiblePalette;
  paperNote: string | null;
  onPress: () => void;
}) {
  const total = CHAPTER_COUNTS[book] ?? 0;
  const tracked = book === 'Psalms' ? 40 : total;
  let complete = 0;
  let prog = 0;
  let write = 0;
  let notStarted = 0;
  if (studyState) {
    for (let c = 1; c <= tracked; c++) {
      const s = chapterStatus(studyState, book, c);
      if (s === 'complete') complete++;
      else if (s === 'in-progress') prog++;
      else if (s === 'write') write++;
      else if (s === 'not-started') notStarted++;
    }
  }
  const pct = tracked ? Math.round((100 * complete) / tracked) : 0;
  const ppct = tracked ? Math.round((100 * prog) / tracked) : 0;
  const paper = paperNote ? `handwritten notes, ${paperNote}` : null;
  const parts: string[] = [];
  parts.push(`${complete} of ${tracked} complete`);
  if (write) parts.push(`${write} to write`);
  if (prog) parts.push(tracked === prog ? `all ${prog} in progress` : `${prog} in progress`);
  if (notStarted && complete === 0 && !write && !prog) parts.push('not started');
  if (book === 'Psalms') parts.push('of the 40 the list tracks');
  if (paper) parts.push(paper);

  return (
    <Pressable style={styles.bookrow} onPress={onPress}>
      <View style={styles.btop}>
        <Text style={[styles.bname, { color: palette.ink }]}>
          {book} <Text style={{ color: palette.rasp }}>›</Text>
          {paperNote ? <Text style={[styles.papermark, { color: palette.inkSoft }]}>  ✎ on paper</Text> : null}
        </Text>
        <Text style={[styles.bcount, { color: palette.inkSoft }]}>{parts.join(' · ')}</Text>
      </View>
      <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
        <View style={[styles.threadFill, { backgroundColor: palette.rasp, width: `${pct}%` }]} />
        {ppct ? (
          <View
            style={[styles.threadFill, { backgroundColor: '#EBD489', width: `${ppct}%`, marginLeft: `${pct}%`, position: 'absolute', left: 0 }]}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 14.5, fontWeight: '800', flex: 1 },
  queueBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  queueBtnText: { fontSize: 12, fontWeight: '800' },
  page: { paddingHorizontal: 22, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  h2: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8, textAlign: 'center' },
  vsub: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 14, paddingHorizontal: 6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  subhead: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', paddingTop: 24, paddingBottom: 4 },
  bookrow: { paddingVertical: 11, gap: 7 },
  btop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  bname: { fontSize: 16, fontWeight: '700' },
  papermark: { fontSize: 11, fontWeight: '600' },
  bcount: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
  thread: { height: 5, borderRadius: 3, overflow: 'hidden', position: 'relative' },
  threadFill: { height: 5, borderRadius: 3 },
  canonQuiet: { fontSize: 13, lineHeight: 22.5, paddingTop: 8 },
  subheadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 24, paddingBottom: 4 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  editorCard: { position: 'absolute', left: 20, right: 20, top: '30%', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  editorTitle: { fontSize: 16, fontWeight: '800' },
  editorSub: { fontSize: 12.5, lineHeight: 18, marginTop: 5 },
  editorInput: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 15, marginTop: 14 },
  editorBtns: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 16 },
  editorSave: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  editorSaveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
});
