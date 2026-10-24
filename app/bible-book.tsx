// ─── v205 Book view ──────────────────────────────────────────────────────────
// One book: the chapter grid in the states HE set in the app, an honest
// sumline, and a detail strip for the selected chapter — Read, Read as
// Stories, the quick queue move, and (v206) the FULL status editor:
// all six states as chips, so any chapter can be set — or set back to
// None — right here. v205 offered no way down from the grid ("I can't
// seem to undo them"); v206's editor is the fix. The v205 tracked-
// subset note is gone with the seed it described.

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import { chapterCountFor } from '@/lib/bible-v205/index';
import type { StudyStatus } from '@/lib/bible-v205/types';
import {
  chapterMarks,
  chapterStatus,
  formatReadDate,
  loadStudyState,
  type StudyState,
} from '@/lib/bible-v205/study';
import { markChapterRead, transitionChapterStatus, unmarkChapterRead } from '@/lib/bible-v205/rewards';
import { Ornament, StatusChip, STATUS_LABEL } from '@/components/bible-v205/blocks';
import { BookCompleteCelebration } from '@/components/bible-v205/celebration';
import { chapterLabel, useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';

/** v206: the detail strip's full status editor — every state a chapter
 * can wear, in pipeline order, None last (the way back down). */
const STATUS_EDITOR_ORDER: StudyStatus[] = ['write', 'in-progress', 'complete', 'restudy', 'not-started', 'none'];

/** Chip colors mirror the StatusChip in components/bible-v205/blocks. */
function editorChipColors(palette: BiblePalette, s: StudyStatus) {
  return s === 'complete'
    ? { backgroundColor: palette.rasp, borderColor: palette.rasp, color: '#FFFFFF' }
    : s === 'in-progress'
      ? { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder, color: palette.yellowInk }
      : s === 'write'
        ? { backgroundColor: palette.paper, borderColor: palette.rasp, color: palette.raspDeep }
        : s === 'restudy'
          ? { backgroundColor: palette.band, borderColor: '#EFC3D6', color: palette.bandInk }
          : { backgroundColor: palette.greyBg, borderColor: palette.greyBorder, color: palette.greyLabel };
}

export default function BibleBookScreen() {
  const router = useRouter();
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  const params = useLocalSearchParams<{ book?: string }>();
  const book = typeof params.book === 'string' && params.book ? params.book : 'Genesis';
  const total = chapterCountFor(book);

  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [selected, setSelected] = useState(1);
  const [celebration, setCelebration] = useState<{ book: string; bibleComplete: boolean } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadStudyState().then((s) => live && setStudyState(s));
      return () => {
        live = false;
      };
    }, []),
  );

  const statusOf = (c: number): StudyStatus =>
    studyState ? chapterStatus(studyState, book, c) : 'none';

  // v228: the second mark. The grid shows both — the notes state in
  // the cell's dress (above) and a quiet dot for a read chapter; the
  // editor below names the read date outright.
  const readDateOf = (c: number): string | null =>
    studyState ? chapterMarks(studyState, book, c).readDate : null;
  const readCount = useMemo(() => {
    let n = 0;
    for (let c = 1; c <= total; c++) if (readDateOf(c)) n += 1;
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyState, book, total]);

  const counts = useMemo(() => {
    const m = new Map<StudyStatus, number>();
    for (let c = 1; c <= total; c++) {
      const s = statusOf(c);
      m.set(s, (m.get(s) ?? 0) + 1);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyState, book, total]);

  const selStatus = statusOf(selected);
  const selReadDate = readDateOf(selected);
  const applyRead = async () => {
    if (!studyState) return;
    const result = await markChapterRead(studyState, book, selected);
    setStudyState(result.state);
  };
  const clearRead = async () => {
    if (!studyState) return;
    setStudyState(await unmarkChapterRead(studyState, book, selected));
  };
  const openChapter = (stories: boolean) =>
    router.push({
      pathname: '/bible-chapter',
      params: { book, chapter: String(selected), ...(stories ? { stories: '1' } : {}) },
    });
  const applyStatus = async (s: StudyStatus) => {
    if (!studyState) return;
    const result = await transitionChapterStatus(studyState, book, selected, s);
    setStudyState(result.state);
    if (result.bookCompleted) {
      setCelebration({ book: result.bookCompleted, bibleComplete: result.bibleCompleted });
    }
  };

  const cellStyle = (s: StudyStatus) =>
    s === 'complete'
      ? { backgroundColor: palette.rasp, borderColor: palette.rasp, color: '#FFFFFF' }
      : s === 'in-progress'
        ? { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder, color: palette.yellowInk }
        : s === 'write'
          ? { backgroundColor: palette.paper, borderColor: palette.rasp, color: palette.raspDeep }
          : s === 'restudy'
            ? { backgroundColor: palette.band, borderColor: '#EFC3D6', color: palette.bandInk }
            : { backgroundColor: palette.greyBg, borderColor: palette.greyBorder, color: palette.greyLabel };

  const content = (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>{book}</Text>
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
          <Text style={[styles.h2, { color: palette.ink }]}>{book}</Text>
          <Ornament palette={palette} />
        </View>

        <View style={styles.sumline}>
          {(['complete', 'in-progress', 'write', 'restudy', 'not-started', 'none'] as StudyStatus[])
            .filter((s) => (counts.get(s) ?? 0) > 0)
            .map((s) => (
              <View key={s} style={[styles.sumChip, { borderColor: palette.line, backgroundColor: palette.paper2 }]}>
                <StatusChip status={s} palette={palette} />
                <Text style={[styles.sumN, { color: palette.ink }]}>{counts.get(s)}</Text>
              </View>
            ))}
          <View style={[styles.sumChip, { borderColor: palette.line, backgroundColor: palette.paper2 }]}>
            <Text style={[styles.sumN, { color: palette.ink }]}>
              {total} {total === 1 ? 'chapter' : 'chapters'}
            </Text>
          </View>
          {readCount > 0 ? (
            <View style={[styles.sumChip, { borderColor: palette.line, backgroundColor: palette.paper2 }]}>
              <View style={[styles.readDot, { backgroundColor: palette.rasp }]} />
              <Text style={[styles.sumN, { color: palette.ink }]}>{readCount} read</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: total }, (_, i) => i + 1).map((c) => {
            const s = statusOf(c);
            const st = cellStyle(s);
            const isSel = c === selected;
            return (
              <Pressable
                key={c}
                style={[
                  styles.cell,
                  { backgroundColor: st.backgroundColor, borderColor: st.borderColor },
                  isSel ? { borderColor: palette.ink, borderWidth: 2 } : null,
                ]}
                onPress={() => setSelected(c)}
              >
                <Text style={[styles.cellN, { color: st.color }]}>{c}</Text>
                {readDateOf(c) ? (
                  <View style={[styles.cellReadDot, { backgroundColor: palette.rasp }]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {celebration ? (
          <View style={{ marginTop: 18 }}>
            <BookCompleteCelebration
              book={celebration.book}
              bibleComplete={celebration.bibleComplete}
              onChooseNext={() => {
                setCelebration(null);
                router.push('/bible-chapters');
              }}
              onDismiss={() => setCelebration(null)}
            />
          </View>
        ) : null}

        <View style={[styles.detail, { borderColor: palette.line, backgroundColor: palette.paper2 }]}>
          <View style={styles.detailHead}>
            <Text style={[styles.detailTitle, { color: palette.ink }]}>{chapterLabel(selected)}</Text>
            <StatusChip status={selStatus} palette={palette} />
          </View>
          <Text style={[styles.detailSub, { color: palette.inkSoft }]}>
            {selStatus === 'complete'
              ? 'Notes finished — read it, walk it as Stories, or queue it for another pass.'
              : selStatus === 'restudy'
                ? 'In your Current list — due another read.'
                : selStatus === 'write'
                  ? 'In your Next list — waiting to be written.'
                  : selStatus === 'in-progress'
                    ? 'Notes under way.'
                    : 'No recorded state — it reads as a plain chapter.'}
          </Text>
          <View style={styles.detailBtns}>
            <Pressable style={[styles.btn, styles.btnPrimary, { backgroundColor: palette.rasp }]} onPress={() => openChapter(false)}>
              <Text style={styles.btnPrimaryText}>Read Chapter</Text>
            </Pressable>
            <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => openChapter(true)}>
              <Text style={[styles.btnText, { color: palette.ink }]}>Read as Stories</Text>
            </Pressable>
            {selStatus === 'complete' ? (
              <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => applyStatus('restudy')}>
                <Text style={[styles.btnText, { color: palette.ink }]}>Add to ReStudy Queue</Text>
              </Pressable>
            ) : selStatus === 'restudy' ? (
              <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => applyStatus('complete')}>
                <Text style={[styles.btnText, { color: palette.ink }]}>Mark Complete</Text>
              </Pressable>
            ) : selStatus === 'write' ? (
              <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => applyStatus('in-progress')}>
                <Text style={[styles.btnText, { color: palette.ink }]}>Start Writing</Text>
              </Pressable>
            ) : selStatus === 'in-progress' ? (
              <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => applyStatus('complete')}>
                <Text style={[styles.btnText, { color: palette.ink }]}>Mark Complete</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.btn, { borderColor: palette.lineDark }]} onPress={() => applyStatus('write')}>
                <Text style={[styles.btnText, { color: palette.ink }]}>Add to Write Queue</Text>
              </Pressable>
            )}
          </View>
          {/* v228: the READ mark, beside the notes editor — set and
              cleared here and in the reader, nowhere else. */}
          <View style={styles.readRow}>
            {selReadDate ? (
              <>
                <Text style={[styles.readLine, { color: palette.ink }]}>✓ Read · {formatReadDate(selReadDate)}</Text>
                <Pressable onPress={clearRead} hitSlop={8} accessibilityLabel={`Clear the read mark for ${book} ${selected}`}>
                  <Text style={[styles.readAction, { color: palette.inkFaint, textDecorationLine: 'underline' }]}>Clear</Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={applyRead} hitSlop={8} accessibilityLabel={`Mark ${book} ${selected} as read`}>
                <Text style={[styles.readAction, { color: palette.raspDeep }]}>Mark as Read</Text>
              </Pressable>
            )}
          </View>
          <Text style={[styles.editorLabel, { color: palette.inkSoft }]}>Notes state — the notes-written mark; any state, including back to none</Text>
          <View style={styles.editorRow}>
            {STATUS_EDITOR_ORDER.map((s) => {
              const cs = editorChipColors(palette, s);
              const isCurrent = s === selStatus;
              return (
                <Pressable
                  key={s}
                  onPress={() => applyStatus(s)}
                  style={[
                    styles.editorChip,
                    { backgroundColor: cs.backgroundColor, borderColor: isCurrent ? palette.ink : cs.borderColor },
                    isCurrent ? styles.editorChipCurrent : null,
                  ]}
                >
                  <Text style={[styles.editorChipText, { color: cs.color }]}>
                    {isCurrent ? '● ' : ''}{STATUS_LABEL[s]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.detailHint, { color: palette.inkFaint }]}>
            Notes: {STATUS_LABEL[selStatus]} — it changes only when you change it.
          </Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );

  if (skin === 'paper') return <PaperSettle>{content}</PaperSettle>;
  if (skin === '8bit') return <BitSettle>{content}</BitSettle>;
  return content;
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
  sumline: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 },
  sumChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  sumN: { fontSize: 12.5, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 20 },
  cell: { width: '17.9%', aspectRatio: 1.15, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cellN: { fontSize: 16, fontWeight: '800' },
  cellReadDot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3 },
  readDot: { width: 7, height: 7, borderRadius: 4 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  readLine: { fontSize: 13.5, fontWeight: '800' },
  readAction: { fontSize: 13.5, fontWeight: '800' },
  detail: { borderWidth: 1, borderRadius: 14, padding: 16, marginTop: 20 },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { fontSize: 19, fontWeight: '800' },
  detailSub: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  detailBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  btn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  btnPrimary: { borderWidth: 0 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  btnText: { fontWeight: '700', fontSize: 13.5 },
  detailHint: { fontSize: 11.5, marginTop: 12 },
  editorLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 16 },
  editorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  editorChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  editorChipCurrent: { borderWidth: 2.5 },
  editorChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
});
