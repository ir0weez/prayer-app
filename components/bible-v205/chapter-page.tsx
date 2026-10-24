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
  Modal,
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
import {
  buildDisplaySections,
  buildReadOnlySections,
  chapterCountFor,
  flattenEntries,
  getBookData,
  getChapterData,
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
  isKept,
  loadMarks,
  marksFor,
  saveMarks,
  toggleKept,
  withMarks,
  type EntryMarks,
  type MarksMap,
  type TintColor,
} from '@/lib/bible-v205/marks';
import {
  chapterStatus,
  loadStudyState,
  type StudyState,
} from '@/lib/bible-v205/study';
import { transitionChapterStatus } from '@/lib/bible-v205/rewards';
import { loadChapterVerses, type VerseText } from '@/lib/bible-v205/verses';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import { useSkin } from '@/hooks/use-skin';
import { BlockView, CategoryTag, Ornament, SectionBand, StatusChip, STATUS_LABEL } from './blocks';
import { BookCompleteCelebration } from './celebration';
import { IndexSheet } from './index-sheet';
import { StoriesView } from './stories-view';
import { chapterLabel, rangeLabel, useBiblePalette, type BiblePalette } from './palette';

export interface ChapterPageProps {
  book: string;
  chapter: number;
  /** Open straight into Stories mode (book view's "Read as Stories"). */
  initialStories?: boolean;
  onBack: () => void;
  onOpenBook: () => void;
  onOpenQueue: () => void;
  onNavigateChapter: (chapter: number) => void;
}

const STATUS_MENU: StudyStatus[] = ['write', 'in-progress', 'complete', 'restudy', 'not-started', 'none'];

/** App-level read-mode preference ("With notes" is the default). */
export const READ_MODE_KEY = 'prayercircle.bible.v205.readmode.v1';

export function ChapterPageView(props: ChapterPageProps) {
  const { book, chapter } = props;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  const chapterData = useMemo(() => getChapterData(book, chapter), [book, chapter]);
  const totalChapters = chapterCountFor(book);

  const [verses, setVerses] = useState<VerseText[]>([]);
  const [versesLoaded, setVersesLoaded] = useState(false);
  const [marks, setMarks] = useState<MarksMap>({});
  const [studyState, setStudyState] = useState<StudyState | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [labels, setLabels] = useState<UserLabels | null>(null);
  const [celebration, setCelebration] = useState<{ book: string; bibleComplete: boolean } | null>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean> | null>(null);
  const [sheet, setSheet] = useState<null | 'verses' | 'search'>(null);
  const [stories, setStories] = useState(!!props.initialStories);
  const [statusMenu, setStatusMenu] = useState(false);
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
        : { sections: storyBase, marks: notesSplit.marks },
    [readOnly, storyBase, marks, book, chapter, notesSplit],
  );
  const storySections = storySplit.sections;
  const flat = useMemo(() => flattenEntries(sections), [sections]);
  // The read-only kept fallback walks COVERING with-notes entries; it
  // reads the unsplit sections so a verse's covering entry is the one
  // its marks were actually stored on.
  const notesFlat = useMemo(() => flattenEntries(rawNotesSections), [rawNotesSections]);
  const verseText = useMemo(() => new Map(verses.map((v) => [v.verse, v.text])), [verses]);
  const status: StudyStatus = studyState ? chapterStatus(studyState, book, chapter) : 'none';

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
  const handleAddLine = async (start: number, end: number, kind: 'highlight' | 'thought' | 'note', text: string) => {
    const next = addKeeperLine(marks, book, chapter, start, end, kind, text);
    setMarks(next);
    await saveMarks(next);
  };
  const handleTint = async (start: number, end: number, tint: TintColor | null) => {
    const next = withMarks(marks, book, chapter, start, end, { tint });
    setMarks(next);
    await saveMarks(next);
  };
  const handleSetStatus = async (s: StudyStatus) => {
    if (!studyState) return;
    setStatusMenu(false);
    const result = await transitionChapterStatus(studyState, book, chapter, s);
    setStudyState(result.state);
    if (result.bookCompleted) {
      setCelebration({ book: result.bookCompleted, bibleComplete: result.bibleCompleted });
    }
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
              : `Chapter ${chapter} — no study status recorded yet. Tap to set one.`;

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
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.page}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          viewHeight.current = layoutMeasurement.height;
          contentHeight.current = contentSize.height;
          const max = contentSize.height - layoutMeasurement.height;
          setProgress(max > 0 ? Math.min(1, contentOffset.y / max) : 0);
        }}
        scrollEventThrottle={32}
      >
        {/* ── slim status strip ── */}
        <Pressable style={[styles.strip, { backgroundColor: palette.raspTint }]} onPress={() => setStatusMenu(true)}>
          <StatusChip status={status} palette={palette} />
          <Text style={[styles.stripText, { color: palette.ink }]}>{stripText}</Text>
          <Text style={[styles.stripLink, { color: palette.raspDeep }]}>Queue ›</Text>
        </Pressable>

        {celebration ? (
          <View style={{ marginTop: 14 }}>
            <BookCompleteCelebration
              book={celebration.book}
              bibleComplete={celebration.bibleComplete}
              onChooseNext={() => {
                setCelebration(null);
                props.onOpenBook();
              }}
              onDismiss={() => setCelebration(null)}
            />
          </View>
        ) : null}

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
          <Pressable style={[styles.readBtn, { backgroundColor: palette.rasp }]} onPress={() => setStories(true)}>
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
            {section.entries.map((entry) => (
              <EntryView
                key={entry.start}
                entry={entry}
                book={book}
                chapter={chapter}
                verseText={verseText}
                marksEntry={marksFor(displayMarks, book, chapter, entry.start, entry.end)}
                kept={entryStatus.get(entryKey(book, chapter, entry.start, entry.end))?.kept ?? false}
                open={isOpen(entry)}
                flash={flashKey === entryKey(book, chapter, entry.start, entry.end)}
                flashAnim={flashAnim}
                palette={palette}
                onToggleOpen={() => toggleOpen(entry)}
                onToggleKept={() => handleToggleKept(entry.start, entry.end, entry.blocks.some((b) => b.kind === 'highlight'))}
                onAddLine={(kind, text) => handleAddLine(entry.start, entry.end, kind, text)}
                onTint={(tint) => handleTint(entry.start, entry.end, tint)}
                onCategory={(category) => handleCategory(entry.start, entry.end, category)}
                registerY={(y) =>
                  yByKey.current.set(
                    entryKey(book, chapter, entry.start, entry.end),
                    (yByKey.current.get(`secwrap-${section.start}`) ?? 0) + y,
                  )
                }
              />
            ))}
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

      {/* ── Status menu ── */}
      <Modal visible={statusMenu} transparent animationType="fade" onRequestClose={() => setStatusMenu(false)}>
        <Pressable style={styles.scrim} onPress={() => setStatusMenu(false)} />
        <View style={[styles.menu, { backgroundColor: palette.paper }]}>
          <Text style={[styles.menuTitle, { color: palette.ink }]}>
            {book} {chapter} — study status
          </Text>
          <Text style={[styles.menuSub, { color: palette.inkSoft }]}>
            Recorded state: {STATUS_LABEL[status]}. Changing it here moves the chapter through your own pipeline — reading alone never does.
          </Text>
          {STATUS_MENU.map((s) => (
            <Pressable
              key={s}
              style={[styles.menuRow, s === status ? { backgroundColor: palette.raspTint } : null]}
              onPress={() => handleSetStatus(s)}
            >
              <StatusChip status={s} palette={palette} />
              <Text style={{ color: palette.ink, fontSize: 13.5, flex: 1 }}>
                {s === 'write' ? 'Add to Write queue (Next)'
                  : s === 'restudy' ? 'Add to ReStudy queue (Current)'
                    : s === 'complete' ? 'Mark notes complete'
                      : s === 'in-progress' ? 'Mark in progress'
                        : s === 'not-started' ? 'Mark not started'
                          : 'Clear status'}
              </Text>
              {s === status ? <MaterialIcons name="check" size={17} color={palette.rasp} /> : null}
            </Pressable>
          ))}
          <View style={[styles.menuDivider, { backgroundColor: palette.line }]} />
          <Pressable style={styles.menuRow} onPress={() => { setStatusMenu(false); props.onOpenQueue(); }}>
            <MaterialIcons name="queue" size={18} color={palette.rasp} />
            <Text style={{ color: palette.ink, fontSize: 13.5 }}>Open the Study Queue</Text>
          </Pressable>
        </View>
      </Modal>
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
  kept: boolean;
  open: boolean;
  flash: boolean;
  flashAnim: Animated.Value;
  palette: BiblePalette;
  onToggleOpen: () => void;
  onToggleKept: () => void;
  onAddLine: (kind: 'highlight' | 'thought' | 'note', text: string) => void;
  onTint: (tint: TintColor | null) => void;
  onCategory: (category: NoteCategory | null) => void;
  registerY: (y: number) => void;
}) {
  const { entry, palette } = props;
  const [composer, setComposer] = useState<null | 'highlight' | 'thought' | 'note'>(null);
  const [draft, setDraft] = useState('');
  const single = entry.start === entry.end;
  const tintColor =
    props.marksEntry?.tint === 'yellow' ? palette.tintYellow
      : props.marksEntry?.tint === 'rose' ? palette.tintRose
        : props.marksEntry?.tint === 'green' ? palette.tintGreen
          : null;
  const flashBg = props.flash
    ? props.flashAnim.interpolate({ inputRange: [0, 1], outputRange: ['rgba(230,73,128,0)', 'rgba(230,73,128,0.14)'] })
    : 'transparent';

  const blocks = [...entry.blocks];
  // v210: his plain notes lead his own lines under the verses — inset
  // body text, no box — ahead of the Highlight / Main Thought callouts.
  for (const text of props.marksEntry?.notes ?? []) blocks.push({ kind: 'note', text });
  for (const text of props.marksEntry?.highlights ?? []) blocks.push({ kind: 'highlight', text });
  for (const text of props.marksEntry?.thoughts ?? []) blocks.push({ kind: 'thought', text });
  const firstParaIdx = blocks.findIndex((b) => b.kind === 'para' || b.kind === 'conversation');

  return (
    <Animated.View
      style={[styles.entry, { backgroundColor: flashBg }]}
      onLayout={(e) => props.registerY(e.nativeEvent.layout.y)}
    >
      <Pressable style={styles.entryHead} onPress={props.onToggleOpen}>
        <View style={styles.heartSlot}>
          {props.kept ? <Text style={{ color: palette.rose, fontSize: 14 }}>♥</Text> : null}
        </View>
        {single ? (
          <Text style={[styles.vnumBig, { color: palette.vnum }]}>{entry.start}</Text>
        ) : (
          <Text style={[styles.vnumRange, { color: palette.vnum }]}>{entry.start}–{entry.end}</Text>
        )}
        <View style={styles.entryVerses}>
          {Array.from({ length: entry.end - entry.start + 1 }, (_, i) => entry.start + i).map((v) => (
            <Text key={v} style={[styles.entryVerse, { color: palette.ink }]}>
              {!single ? <Text style={[styles.sup, { color: palette.rasp }]}>{v} </Text> : null}
              {props.verseText.get(v) ?? ''}
            </Text>
          ))}
        </View>
        <MaterialIcons
          name={props.open ? 'expand-less' : 'expand-more'}
          size={19}
          color={palette.inkFaint}
          style={{ marginTop: 3 }}
        />
      </Pressable>

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
          {blocks.length === 0 ? (
            <Text style={[styles.noNotes, { color: palette.inkFaint }]}>
              No notes on this verse — it stands on its own here.
            </Text>
          ) : (
            blocks.map((b, i) => (
              <BlockView key={i} block={b} palette={palette} tinted={i === firstParaIdx ? tintColor : null} />
            ))
          )}

          <View style={[styles.markbar, { borderTopColor: palette.line }]}>
            <Pressable style={styles.markBtn} onPress={props.onToggleKept}>
              <Text style={{ color: props.kept ? palette.rose : palette.inkSoft, fontSize: 13 }}>♥</Text>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>{props.kept ? 'Kept' : 'Keep'}</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => { setComposer('highlight'); setDraft(''); }}>
              <Text style={{ color: palette.hlMark, fontSize: 12 }}>✦</Text>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Highlight</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => { setComposer('thought'); setDraft(''); }}>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Main Thought</Text>
            </Pressable>
            <Pressable style={styles.markBtn} onPress={() => { setComposer('note'); setDraft(''); }}>
              <Text style={[styles.markBtnText, { color: palette.inkSoft }]}>Note</Text>
            </Pressable>
            <View style={styles.swatches}>
              {(['yellow', 'rose', 'green'] as TintColor[]).map((t) => (
                <Pressable
                  key={t}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: t === 'yellow' ? '#F5C542' : t === 'rose' ? '#F08BB4' : '#7FCB9B',
                      borderColor: props.marksEntry?.tint === t ? palette.ink : 'transparent',
                      borderWidth: props.marksEntry?.tint === t ? 2 : 0,
                    },
                  ]}
                  onPress={() => props.onTint(props.marksEntry?.tint === t ? null : t)}
                />
              ))}
              <Text style={[styles.tintLabel, { color: palette.inkFaint }]}>Tint</Text>
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
                {composer === 'highlight' ? '✦ Your Highlight' : composer === 'note' ? 'Your Note' : 'Main Thought'}
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
              <View style={styles.composerBtns}>
                <Pressable onPress={() => setComposer(null)}>
                  <Text style={{ color: palette.inkSoft, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.addBtn, { backgroundColor: palette.rasp }]}
                  onPress={() => {
                    if (draft.trim()) props.onAddLine(composer, draft.trim());
                    setComposer(null);
                  }}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
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
  modeRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 2 },
  modeSeg: { flexDirection: 'row', borderWidth: 1, borderRadius: 999, padding: 2, gap: 2 },
  modeBtn: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14 },
  modeBtnText: { fontSize: 12, fontWeight: '700' },
  page: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 8 },
  strip: { flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: -20, paddingVertical: 9, paddingHorizontal: 20 },
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
  entryHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13, paddingHorizontal: 2 },
  heartSlot: { width: 20, alignItems: 'center', paddingTop: 5 },
  vnumBig: { fontSize: 28, fontWeight: '300', width: 40, lineHeight: 32, textAlign: 'center' },
  vnumRange: { fontSize: 15.5, fontWeight: '700', width: 40, lineHeight: 32, textAlign: 'center' },
  entryVerses: { flex: 1, gap: 3 },
  entryVerse: { fontSize: 15.5, fontWeight: '700', lineHeight: 24 },
  sup: { fontSize: 10.5, fontWeight: '800' },
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
  addBtn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 16 },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  loading: { textAlign: 'center', fontSize: 13.5, marginTop: 26 },
  footNote: { fontSize: 12, lineHeight: 18, marginTop: 34, textAlign: 'center' },
  chapterNav: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, gap: 10 },
  navBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  navOff: { opacity: 0.35 },
  fab: { position: 'absolute', right: 18, bottom: 24, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingVertical: 11, paddingHorizontal: 17, shadowColor: '#9C1B49', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  fabText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13.5 },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  menu: { position: 'absolute', left: 16, right: 16, bottom: 24, borderRadius: 16, padding: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  menuTitle: { fontSize: 16, fontWeight: '800' },
  menuSub: { fontSize: 12.5, lineHeight: 18, marginTop: 5, marginBottom: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 10 },
  menuDivider: { height: 1, marginVertical: 8 },
});
