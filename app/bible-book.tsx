// ─── v205 Book view ──────────────────────────────────────────────────────────
// One book: the chapter grid in the states HE set in the app, an honest
// sumline, and a detail strip for the selected chapter — Read, Read as
// Stories, the quick queue move, and (v206) the FULL status editor:
// all six states as chips, so any chapter can be set — or set back to
// None — right here. v205 offered no way down from the grid ("I can't
// seem to undo them"); v206's editor is the fix. The v205 tracked-
// subset note is gone with the seed it described. v234: the detail
// strip's controls sit under two headers — YOUR STUDY (read, stories,
// the read mark, the re-read queue) and YOUR COMMENTARY (the
// notes-written pipeline) — his "separate what is commentary buttons
// and what is personal study buttons." v243: the screen's content
// moved into BibleBookContent under the boundary (see the shell at
// the foot of this file) so its computes render protected.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { bibleShellParamsForRoute, type BiblePaneNav } from '@/lib/bible-pane';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import { chapterCountFor } from '@/lib/bible-v205/index';
import type { StudyStatus } from '@/lib/bible-v205/types';
import {
  chapterDisplayMarks,
  chapterMarks,
  chapterStatus,
  formatReadDate,
  loadStudyState,
  type ChapterDisplayMarks,
  type StudyState,
} from '@/lib/bible-v205/study';
import {
  chapterHasNotes,
  loadStudioImports,
  type StudioImportsMap,
} from '@/lib/bible-v205/studio-import';
import { markChapterRead, transitionChapterStatus, unmarkChapterRead } from '@/lib/bible-v205/rewards';
import { Ornament, ReadChip, StatusChip, STATUS_LABEL } from '@/components/bible-v205/blocks';
import { BookCompleteCelebration } from '@/components/bible-v205/celebration';
import { chapterLabel, useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';

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
          ? { backgroundColor: palette.band, borderColor: palette.bandBorder, color: palette.bandInk }
          : { backgroundColor: palette.greyBg, borderColor: palette.greyBorder, color: palette.greyLabel };
}

/** v265: pane mode (the shell's Study tab) hands this screen its
 * book, the pane's focus flag, and navigation callbacks; route
 * mode (a deep link's landing shell) keeps the router + params. */
export interface BibleBookPaneProps {
  nav: BiblePaneNav;
  focused: boolean;
  book: string;
}

function BibleBookContent(props: { pane?: BibleBookPaneProps } = {}) {
  const router = useRouter();
  const inPane = !!props.pane;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  // v259: the app tab bar rides over this screen (Study active).
  const tabBarHeight = useTabBarOccupiedHeight();
  const params = useLocalSearchParams<{ book?: string }>();
  const book = props.pane
    ? props.pane.book
    : typeof params.book === 'string' && params.book ? params.book : 'Genesis';
  const total = chapterCountFor(book);

  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [studioImports, setStudioImports] = useState<StudioImportsMap>({});
  const [selected, setSelected] = useState(1);
  const [celebration, setCelebration] = useState<{ book: string; bibleComplete: boolean } | null>(null);

  const reloadFocusData = useCallback(() => {
    let live = true;
    loadStudyState().then((s) => live && setStudyState(s));
    loadStudioImports().then((m) => live && setStudioImports(m));
    return () => {
      live = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      // v265: pane focus is the pane's own flag (below).
      if (inPane) return;
      return reloadFocusData();
    }, [inPane, reloadFocusData]),
  );
  const paneFocused = props.pane?.focused ?? false;
  useEffect(() => {
    if (!inPane || !paneFocused) return;
    return reloadFocusData();
  }, [inPane, paneFocused, reloadFocusData]);

  const statusOf = (c: number): StudyStatus =>
    studyState ? chapterStatus(studyState, book, c) : 'none';

  // v228: the second mark. The grid shows both — the notes state in
  // the cell's dress (above) and a quiet dot for a read chapter; the
  // editor below names the read date outright.
  const readDateOf = (c: number): string | null =>
    studyState ? chapterMarks(studyState, book, c).readDate : null;

  // v233: the display model — a chapter with no notes (shipped or
  // imported) headlines as READ, never Complete (chapterDisplayMarks).
  const displayOf = (c: number): ChapterDisplayMarks =>
    studyState
      ? chapterDisplayMarks(studyState, book, c, chapterHasNotes(book, c, studioImports))
      : {
          status: 'none',
          readDate: null,
          noted: chapterHasNotes(book, c, studioImports),
          displayRead: false,
          headline: 'status',
          showNotesEditor: false,
        };

  const readCount = useMemo(() => {
    let n = 0;
    for (let c = 1; c <= total; c++) if (displayOf(c).displayRead) n += 1;
    return n;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyState, studioImports, book, total]);

  const counts = useMemo(() => {
    const m = new Map<StudyStatus, number>();
    for (let c = 1; c <= total; c++) {
      const d = displayOf(c);
      // A noteless chapter presenting as Read is counted as read
      // (readCount above), not as a notes-Complete it never claimed.
      if (!d.noted && d.status === 'complete') continue;
      m.set(d.status, (m.get(d.status) ?? 0) + 1);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyState, studioImports, book, total]);

  const selStatus = statusOf(selected);
  const selReadDate = readDateOf(selected);
  const selDisplay = displayOf(selected);
  const applyRead = async () => {
    if (!studyState) return;
    const result = await markChapterRead(studyState, book, selected, undefined, studioImports);
    setStudyState(result.state);
    if (result.bookCompleted) {
      setCelebration({ book: result.bookCompleted, bibleComplete: result.bibleCompleted });
    }
  };
  const clearRead = async () => {
    if (!studyState) return;
    setStudyState(await unmarkChapterRead(studyState, book, selected));
  };
  const openChapter = (stories: boolean) => {
    // v265: pane mode pushes the pane stack. Route mode (a deep
    // link's landing) hands off to the shell's pane — no code path
    // in the app navigates to the Bible routes anymore.
    if (props.pane) props.pane.nav.openChapter(book, selected, stories);
    else
      router.navigate({
        pathname: '/(tabs)',
        params: bibleShellParamsForRoute({ name: 'chapter', book, chapter: selected, stories }),
      });
  };
  const goBack = () => {
    if (props.pane) props.pane.nav.back();
    else router.back();
  };
  const openQueue = () => {
    if (props.pane) props.pane.nav.openQueue();
    else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'queue' }) });
  };
  const openBooks = () => {
    if (props.pane) props.pane.nav.openBooks();
    else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'books' }) });
  };
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
            ? { backgroundColor: palette.band, borderColor: palette.bandBorder, color: palette.bandInk }
            : { backgroundColor: palette.greyBg, borderColor: palette.greyBorder, color: palette.greyLabel };

  const content = (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: inPane ? 8 : insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>{book}</Text>
        <Pressable
          onPress={openQueue}
          style={[styles.queueBtn, { backgroundColor: palette.band }, palette.btnDress]}
        >
          <Text style={[styles.queueBtnText, { color: palette.raspDeep }]}>Study Queue</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }, palette.h2Size != null ? { fontSize: palette.h2Size } : null]}>{book}</Text>
          <Ornament palette={palette} />
        </View>

        <View style={styles.sumline}>
          {(['complete', 'in-progress', 'write', 'restudy', 'not-started', 'none'] as StudyStatus[])
            .filter((s) => (counts.get(s) ?? 0) > 0)
            .map((s) => (
              <View key={s} style={[styles.sumChip, { backgroundColor: palette.band }]}>
                <StatusChip status={s} palette={palette} />
                <Text style={[styles.sumN, { color: palette.ink }]}>{counts.get(s)}</Text>
              </View>
            ))}
          <View style={[styles.sumChip, { backgroundColor: palette.band }]}>
            <Text style={[styles.sumN, { color: palette.ink }]}>
              {total} {total === 1 ? 'chapter' : 'chapters'}
            </Text>
          </View>
          {readCount > 0 ? (
            <View style={[styles.sumChip, { backgroundColor: palette.band }]}>
              <View style={[styles.readDot, { backgroundColor: palette.rasp }]} />
              <Text style={[styles.sumN, { color: palette.ink }]}>{readCount} read</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.grid}>
          {Array.from({ length: total }, (_, i) => i + 1).map((c) => {
            const s = statusOf(c);
            const d = displayOf(c);
            // v233: a noteless chapter's cell follows its READ state;
            // a noted chapter's cell wears its notes state, as before.
            const st = cellStyle(!d.noted && d.displayRead ? 'complete' : s);
            const isSel = c === selected;
            return (
              <Pressable
                key={c}
                style={[
                  styles.cell,
                  palette.frameDress,
                  { backgroundColor: st.backgroundColor, borderColor: st.borderColor },
                  isSel ? { borderColor: palette.ink, borderWidth: 2 } : null,
                ]}
                onPress={() => setSelected(c)}
              >
                <Text style={[styles.cellN, { color: st.color }]}>{c}</Text>
                {d.displayRead ? (
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
                openBooks();
              }}
              onDismiss={() => setCelebration(null)}
            />
          </View>
        ) : null}

        <View style={[styles.detail, { backgroundColor: palette.paper2 }, palette.cardDress]}>
          <View style={styles.detailHead}>
            <Text style={[styles.detailTitle, { color: palette.ink }]}>{chapterLabel(selected)}</Text>
            {selDisplay.headline === 'read' ? (
              <ReadChip palette={palette} />
            ) : (
              <StatusChip status={selStatus} palette={palette} />
            )}
          </View>
          <Text style={[styles.detailSub, { color: palette.inkSoft }]}>
            {!selDisplay.noted
              ? selDisplay.displayRead
                ? 'Read — this chapter has no notes, so reading is the whole mark here.'
                : 'No notes for this chapter — Mark as Read is the mark for it.'
              : selStatus === 'complete'
                ? 'Notes finished — read it, walk it as Stories, or queue it for another pass.'
                : selStatus === 'restudy'
                  ? 'In your Current list — due another read.'
                  : selStatus === 'write'
                    ? 'In your Next list — waiting to be written.'
                    : selStatus === 'in-progress'
                      ? 'Notes under way.'
                      : 'No recorded state — it reads as a plain chapter.'}
          </Text>
          {/* v234 — Two Families (his ruling): the panel's controls
              split under two headers. YOUR STUDY holds the reading
              life of the chapter — open it, walk it as Stories, mark
              it read, queue a re-read. YOUR COMMENTARY holds the
              notes-written pipeline and nothing else. The v233
              display model still decides what shows (showNotesEditor,
              headline); this only moves each control under its own
              family's header — no semantics moved. */}
          <Text style={[styles.groupLabel, { color: palette.inkSoft }]}>Your Study</Text>
          <View style={styles.detailBtns}>
            <Pressable style={[styles.btn, styles.btnPrimary, { backgroundColor: palette.rasp }, palette.btnDress]} onPress={() => openChapter(false)}>
              <Text style={styles.btnPrimaryText}>Read Chapter</Text>
            </Pressable>
            <Pressable style={[styles.btn, { backgroundColor: palette.band }, palette.btnDress]} onPress={() => openChapter(true)}>
              <Text style={[styles.btnText, { color: palette.raspDeep }]}>Read as Stories</Text>
            </Pressable>
            {selStatus === 'complete' ? (
              <Pressable style={[styles.btn, { backgroundColor: palette.band }, palette.btnDress]} onPress={() => applyStatus('restudy')}>
                <Text style={[styles.btnText, { color: palette.raspDeep }]}>Add to ReStudy Queue</Text>
              </Pressable>
            ) : null}
          </View>
          {/* v228: the READ mark — set and cleared here (in Your
              Study) and in the reader, nowhere else. */}
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
          {selDisplay.showNotesEditor || selStatus !== 'none' ? (
            <>
              <Text style={[styles.groupLabel, { color: palette.inkSoft }]}>Your Commentary</Text>
              {selDisplay.showNotesEditor ? (
                <>
                  {selStatus !== 'complete' ? (
                    // The old mixed row's quick move, now at home in
                    // its own family: it sets a notes state, so it
                    // stands with the commentary controls. (Complete's
                    // quick move — Add to ReStudy Queue — is a study
                    // action and lives under Your Study above.)
                    <View style={styles.detailBtns}>
                      {selStatus === 'restudy' || selStatus === 'in-progress' ? (
                        <Pressable style={[styles.btn, { backgroundColor: palette.band }, palette.btnDress]} onPress={() => applyStatus('complete')}>
                          <Text style={[styles.btnText, { color: palette.raspDeep }]}>Mark Complete</Text>
                        </Pressable>
                      ) : selStatus === 'write' ? (
                        <Pressable style={[styles.btn, { backgroundColor: palette.band }, palette.btnDress]} onPress={() => applyStatus('in-progress')}>
                          <Text style={[styles.btnText, { color: palette.raspDeep }]}>Start Writing</Text>
                        </Pressable>
                      ) : (
                        <Pressable style={[styles.btn, { backgroundColor: palette.band }, palette.btnDress]} onPress={() => applyStatus('write')}>
                          <Text style={[styles.btnText, { color: palette.raspDeep }]}>Add to Write Queue</Text>
                        </Pressable>
                      )}
                    </View>
                  ) : null}
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
                </>
              ) : (
                // v233: noteless chapter — a stored notes state is never
                // hidden from him: it stays on file inside the commentary
                // group and counts again the day notes exist for this
                // chapter. v278: the state on file is CHANGEABLE here
                // too — before this, the hint was a dead end: a stored
                // ReStudy on a noteless chapter (his Leviticus 1) could
                // not be removed anywhere in the app, because the only
                // editor in the app was gated on notes existing. The
                // same editor row stands under the hint, walking the
                // same applyStatus door as the noted branch.
                <>
                  <Text style={[styles.detailHint, { color: palette.inkFaint }]}>
                    Notes state on file: {STATUS_LABEL[selStatus]} — it counts again if notes arrive for this chapter.
                  </Text>
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
                </>
              )}
            </>
          ) : null}
        </View>
        {/* v265: in the pane, the pane container carries the tab
            bar's clearance once — only the breathing room stays. */}
        <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
      </ScrollView>

      {/* v259: same app, same bar — Study is the active slot.
          v265: no per-screen bar in the pane (the shell's stands);
          route mode keeps its bar. */}
      {inPane ? null : <BibleTabBar />}
    </View>
  );

  return content;
}

export default function BibleBookScreen(props: { pane?: BibleBookPaneProps } = {}) {
  const { skin } = useSkin();
  // v243: the boundary wraps the content COMPONENT, not the JSX this
  // screen used to build in its own body. Every per-chapter compute
  // (displayOf over the imports map, the counts, the grid) runs while
  // BibleBookContent renders — as a child of the boundary, a throw
  // there lands on the visible fallback. In the v241 shape the same
  // computes ran in the screen's own body while the boundary sat
  // downstream as a child, where React cannot catch them — the Oct 25
  // diagnosis named exactly that gap in this screen's blank-page
  // blast radius. Settle wrappers keep their v241 nesting (outside).
  const guarded = (
    <BibleScreenBoundary>
      <BibleBookContent pane={props.pane} />
    </BibleScreenBoundary>
  );
  // v246: screenRoot — a whole screen's paint is never gated on
  // the settle's fade (see components/paper-motion.tsx).
  if (skin === 'paper') return <PaperSettle screenRoot>{guarded}</PaperSettle>;
  if (skin === '8bit') return <BitSettle screenRoot>{guarded}</BitSettle>;
  return guarded;
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 14.5, fontWeight: '800', flex: 1 },
  // v250: topbar actions are tonal pills, not outlines.
  queueBtn: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  queueBtnText: { fontSize: 12, fontWeight: '800' },
  page: { paddingHorizontal: 22, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  h2: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8, textAlign: 'center' },
  sumline: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginTop: 18 },
  sumChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  sumN: { fontSize: 12.5, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 20 },
  cell: { width: '17.9%', aspectRatio: 1.15, borderWidth: 1.5, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cellN: { fontSize: 16, fontWeight: '800' },
  cellReadDot: { position: 'absolute', bottom: 4, width: 5, height: 5, borderRadius: 3 },
  readDot: { width: 7, height: 7, borderRadius: 4 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  readLine: { fontSize: 13.5, fontWeight: '800' },
  readAction: { fontSize: 13.5, fontWeight: '800' },
  detail: { borderRadius: 28, padding: 18, marginTop: 20 },
  detailHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailTitle: { fontSize: 19, fontWeight: '800' },
  detailSub: { fontSize: 13.5, lineHeight: 20, marginTop: 8 },
  detailBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 13 },
  btn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  btnPrimary: { borderWidth: 0 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  btnText: { fontWeight: '700', fontSize: 13.5 },
  detailHint: { fontSize: 11.5, marginTop: 12 },
  // v234: the two family headers — the editor label's own voice
  // (small caps, letterspaced), one size up so a group reads as a group.
  groupLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 18 },
  editorLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 10 },
  editorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  editorChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 11 },
  editorChipCurrent: { borderWidth: 2.5 },
  editorChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4, textTransform: 'uppercase' },
});
