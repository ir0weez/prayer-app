// ─── v205 Book view ──────────────────────────────────────────────────────────
// One book: the chapter grid in the states HE set in the app, an honest
// countline, and a chapter SHEET for the tapped chapter — Read, Read
// as Stories, the read-mark switch, and the full status editor.
// v311 "The Bible, to the Drawing" (approved Oct 28, 12:42): the grid
// encodes TWO channels — the cell's fill carries the WRITING status,
// a bookmark carries the READ mark (v228's dot is retired); the old
// inline detail strip becomes a bottom sheet with two groups,
// READING and MY WRITING (the drawing's names for the v234 two
// families), ReStudy standing ONCE (its chip), Not Started and None
// merged into one unset state with one Clear path, and no explanatory
// captions anywhere in the sheet (his standing rule). The v233
// display model still decides what shows — the bookmark IS its
// displayRead, the sheet's headline pill IS its headline.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
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
import { loadHandwritten, type HandwrittenEntry } from '@/lib/bible-v205/handwritten';
import { STATUS_LABEL } from '@/components/bible-v205/blocks';
import { BookCompleteCelebration } from '@/components/bible-v205/celebration';
import {
  cellDressFor,
  chapterLabel,
  sheetChipDress,
  useBiblePalette,
} from '@/components/bible-v205/palette';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';

/** v311: the sheet's writing-pipeline chips, in the drawing's order
 * and words. Not Started and None are NOT chips — they are the one
 * unset state, left through the sheet's single Clear state action. */
const SHEET_STATUS_ORDER = ['in-progress', 'write', 'complete', 'restudy'] as const;
type SheetStatus = (typeof SHEET_STATUS_ORDER)[number];
const SHEET_STATUS_LABEL: Record<SheetStatus, string> = {
  'in-progress': 'Writing now',
  write: 'Write next',
  complete: 'Complete',
  restudy: 'Restudy',
};

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
  // v311: the chapter sheet (a bottom-sheet Modal) opens on a cell tap.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [handwritten, setHandwritten] = useState<HandwrittenEntry[]>([]);
  const [celebration, setCelebration] = useState<{ book: string; bibleComplete: boolean } | null>(null);

  const reloadFocusData = useCallback(() => {
    let live = true;
    loadStudyState().then((s) => live && setStudyState(s));
    loadStudioImports().then((m) => live && setStudioImports(m));
    loadHandwritten().then((h) => live && setHandwritten(h));
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
  // v311: the sheet's On-paper chip — real data (the handwritten
  // archive's chapter ranges), shown only when this chapter is
  // covered. It is a fact, not a state: nothing sets it here.
  const selOnPaper = handwritten.some((e) => e.book === book && selected >= e.from && selected <= e.to);
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
        </View>

        {/* v311: the drawing's countline — one centered line of
            counts replaces the chip pile. Written = Complete,
            in hand = In progress, read rides the read channel. */}
        <Text style={[styles.countText, { color: palette.inkSoft }]}>
          {(counts.get('complete') ?? 0) > 0 ? (
            <>
              <Text style={[styles.countStrong, { color: palette.ink }]}>{counts.get('complete')} written</Text>
              {'  ·  '}
            </>
          ) : null}
          {(counts.get('in-progress') ?? 0) > 0 ? (
            <>
              <Text style={[styles.countStrong, { color: palette.ink }]}>{counts.get('in-progress')} in hand</Text>
              {'  ·  '}
            </>
          ) : null}
          {readCount > 0 ? (
            <>
              <Text style={[styles.countStrong, { color: palette.raspDeep }]}>{readCount} read</Text>
              {'  ·  '}
            </>
          ) : null}
          {total} {total === 1 ? 'chapter' : 'chapters'}
        </Text>
        <View style={styles.grid}>
          {Array.from({ length: total }, (_, i) => i + 1).map((c) => {
            const d = displayOf(c);
            // v311 two channels: the FILL is the writing status
            // (chapterDisplayMarks.status — the stored state, always);
            // the BOOKMARK is the read mark (displayRead, the v233
            // presentation — a noteless Complete reads as read).
            const st = cellDressFor(palette, d.status);
            const isSel = c === selected;
            return (
              <Pressable
                key={c}
                style={[
                  styles.cell,
                  { backgroundColor: st.backgroundColor, borderColor: st.borderColor ?? st.backgroundColor },
                  isSel ? { borderColor: palette.ink, borderWidth: 2 } : null,
                ]}
                onPress={() => {
                  setSelected(c);
                  setSheetOpen(true);
                }}
              >
                <Text style={[styles.cellN, { color: st.color }]}>{c}</Text>
                {d.displayRead ? (
                  <MaterialIcons
                    name="bookmark"
                    size={17}
                    color={d.status === 'complete' ? palette.readPill : palette.raspDeep}
                    style={styles.cellBookmark}
                  />
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

        {/* v265: in the pane, the pane container carries the tab
            bar's clearance once — only the breathing room stays. */}
        <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
      </ScrollView>

      {/* ── v311: the chapter sheet — a standard bottom sheet over
          the dimmed grid. Two groups: READING (the read-mark switch
          and the two doors) and MY WRITING (the pipeline chips,
          ReStudy standing once, Not Started/None merged into the
          single Clear state). No explanatory captions. ── */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
        <Pressable style={styles.sheetScrim} onPress={() => setSheetOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: palette.paper2 }, palette.sheetDress]}
            onPress={() => {}}
          >
            <View style={[styles.sheetHandle, { backgroundColor: palette.line }]} />
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: palette.ink }]}>{chapterLabel(selected)}</Text>
              {selDisplay.headline === 'read' ? (
                <View style={[styles.sheetPill, { backgroundColor: palette.raspDeep }]}>
                  <Text style={styles.sheetPillText}>Read</Text>
                </View>
              ) : selStatus !== 'none' && selStatus !== 'not-started' ? (
                <View
                  style={[
                    styles.sheetPill,
                    {
                      backgroundColor: cellDressFor(palette, selStatus).backgroundColor,
                      borderColor: cellDressFor(palette, selStatus).borderColor ?? 'transparent',
                      borderWidth: cellDressFor(palette, selStatus).borderColor ? 1 : 0,
                    },
                  ]}
                >
                  <Text style={[styles.sheetPillText, { color: cellDressFor(palette, selStatus).color }]}>
                    {STATUS_LABEL[selStatus]}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.groupLabel, { color: palette.inkSoft, marginTop: 20 }]}>Reading</Text>
            <View style={[styles.readCard, { backgroundColor: palette.band }]}>
              <View style={[styles.readIconChip, { backgroundColor: palette.primCont }]}>
                <MaterialIcons name="bookmark" size={19} color={palette.raspDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.readCardTitle, { color: palette.ink }]}>Read</Text>
                <Text style={[styles.readCardSub, { color: palette.inkSoft }]}>
                  {selReadDate ? formatReadDate(selReadDate) : 'Not read yet'}
                </Text>
              </View>
              <Switch
                value={!!selReadDate}
                onValueChange={(v) => (v ? applyRead() : clearRead())}
                trackColor={{ false: palette.line, true: palette.rasp }}
                thumbColor={palette.paper2}
                accessibilityLabel={`Mark ${book} ${selected} as read`}
              />
            </View>
            <View style={styles.sheetBtns}>
              <Pressable
                style={[styles.btn, styles.sheetBtn, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={() => {
                  setSheetOpen(false);
                  openChapter(false);
                }}
              >
                <Text style={styles.btnPrimaryText}>Read Chapter</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.sheetBtn, { backgroundColor: palette.band }, palette.btnDress]}
                onPress={() => {
                  setSheetOpen(false);
                  openChapter(true);
                }}
              >
                <Text style={[styles.btnText, { color: palette.raspDeep }]}>Read as Stories</Text>
              </Pressable>
            </View>

            <Text style={[styles.groupLabel, { color: palette.inkSoft }]}>My Writing</Text>
            <View style={styles.chipRow}>
              {SHEET_STATUS_ORDER.map((s) => {
                const isCurrent = s === selStatus;
                const cd = sheetChipDress(palette, s, isCurrent);
                return (
                  <Pressable
                    key={s}
                    onPress={() => applyStatus(s)}
                    style={[
                      styles.stateChip,
                      { backgroundColor: cd.backgroundColor, borderColor: cd.borderColor },
                    ]}
                  >
                    <Text style={[styles.stateChipText, { color: cd.color }]}>
                      {isCurrent && s === 'complete' ? '✓ ' : ''}
                      {SHEET_STATUS_LABEL[s]}
                    </Text>
                  </Pressable>
                );
              })}
              {selOnPaper ? (
                <View style={[styles.stateChip, { backgroundColor: palette.paperBg, borderColor: palette.paperBg }]}>
                  <Text style={[styles.stateChipText, { color: palette.paperInk }]}>✎ On paper</Text>
                </View>
              ) : null}
            </View>
            {selStatus !== 'none' && selStatus !== 'not-started' ? (
              <Pressable style={styles.clearRow} onPress={() => applyStatus('none')} hitSlop={8}>
                <Text style={[styles.clearText, { color: palette.raspDeep }]}>Clear state</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

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
  countText: { fontSize: 13.5, textAlign: 'center', marginTop: 16 },
  countStrong: { fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 20 },
  // v311: the drawing's cell measure — radius 12, aspect 1.05,
  // the number at 17/700; the bookmark rides the top-right corner.
  cell: { width: '17.9%', aspectRatio: 1.05, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cellN: { fontSize: 17, fontWeight: '700' },
  cellBookmark: { position: 'absolute', top: -2, right: 5 },
  btn: { borderRadius: 999, paddingVertical: 9, paddingHorizontal: 15 },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  btnText: { fontWeight: '700', fontSize: 13.5 },
  // v311: the chapter sheet's furniture.
  sheetScrim: { flex: 1, backgroundColor: 'rgba(15,8,25,0.45)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 },
  sheetHandle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  sheetTitle: { fontSize: 24, fontWeight: '800' },
  sheetPill: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  sheetPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  readCard: { flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 16, paddingVertical: 13, paddingHorizontal: 15, marginTop: 10 },
  readIconChip: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  readCardTitle: { fontSize: 16, fontWeight: '700' },
  readCardSub: { fontSize: 12.5, marginTop: 1 },
  sheetBtns: { flexDirection: 'row', gap: 9, marginTop: 12 },
  sheetBtn: { flex: 1, alignItems: 'center', paddingVertical: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  stateChip: { height: 36, borderRadius: 8, borderWidth: 1.5, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  stateChipText: { fontSize: 13, fontWeight: '600' },
  clearRow: { alignSelf: 'flex-end', marginTop: 14, paddingVertical: 4 },
  clearText: { fontSize: 13.5, fontWeight: '600' },
  groupLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 18 },
});
