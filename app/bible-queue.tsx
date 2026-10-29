// ─── v205 Study Queue ────────────────────────────────────────────────────────
// His pipeline, as it stands: Write (his Next list) → Complete →
// ReStudy (his Current list). v206: the lists are built in the app
// (the v205 Notion seeding was cleared by his ruling) and stay editable
// from any chapter's status menu — reading alone never moves a chapter.
// v311 "The Bible, to the Drawing" (approved Oct 28, 12:42): the
// screen quiets to the drawing's frame — pipeline chips in the
// two-channel families (Write outlined, Complete filled, ReStudy
// teal), band heads with the count in a white pill, rows at radius
// 16 carrying a small plum bookmark when the chapter is read, and
// the explanatory note box + count paragraph retired (no captions).

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { bibleShellParamsForRoute, type BiblePaneNav } from '@/lib/bible-pane';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import type { QueueItem } from '@/lib/bible-v205/types';
import { chapterReadDate, loadStudyState, type StudyState } from '@/lib/bible-v205/study';
import { useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { TopFade } from '@/components/top-fade';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';

/** v265: pane mode (the shell's Study tab) hands this screen the
 * pane's focus flag and navigation callbacks; route mode (a deep
 * link's landing shell) keeps the router. */
export interface BibleQueuePaneProps {
  nav: BiblePaneNav;
  focused: boolean;
}

export default function BibleQueueScreen(props: { pane?: BibleQueuePaneProps } = {}) {
  const router = useRouter();
  const inPane = !!props.pane;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  // v259: the app tab bar rides over this screen (Study active).
  const tabBarHeight = useTabBarOccupiedHeight();
  const [studyState, setStudyState] = useState<StudyState | null>(null);

  const reloadStudyState = useCallback(() => {
    let live = true;
    loadStudyState().then((s) => live && setStudyState(s));
    return () => {
      live = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      // v265: pane focus is the pane's own flag (below).
      if (inPane) return;
      return reloadStudyState();
    }, [inPane, reloadStudyState]),
  );
  const paneFocused = props.pane?.focused ?? false;
  useEffect(() => {
    if (!inPane || !paneFocused) return;
    return reloadStudyState();
  }, [inPane, paneFocused, reloadStudyState]);

  const writeQueue = studyState?.writeQueue ?? [];
  const restudyQueue = studyState?.restudyQueue ?? [];
  const open = (item: QueueItem) => {
    // v265: pane mode pushes the pane stack; route mode hands off
    // to the shell's pane (no in-app navigation to Bible routes).
    if (props.pane) props.pane.nav.openChapter(item.book, item.chapter);
    else
      router.navigate({
        pathname: '/(tabs)',
        params: bibleShellParamsForRoute({ name: 'chapter', book: item.book, chapter: item.chapter }),
      });
  };
  const goBack = () => {
    if (props.pane) props.pane.nav.back();
    else router.back();
  };

  const renderItem = (item: QueueItem, kind: 'write' | 'restudy') => {
    // v311: a queued chapter that is also READ carries the read
    // channel's small plum bookmark before its name (the drawing's
    // queue rows) — the read mark itself stays state.reads data.
    const isRead = studyState ? chapterReadDate(studyState, item.book, item.chapter) !== null : false;
    return (
      <Pressable
        key={`${item.book}-${item.chapter}`}
        style={[styles.qitem, { backgroundColor: palette.paper2 }, palette.cardDress, { borderRadius: 16 }]}
        onPress={() => open(item)}
      >
        {isRead ? <MaterialIcons name="bookmark" size={15} color={palette.raspDeep} /> : null}
        <Text style={[styles.qname, { color: palette.ink }]}>
          {item.book} {item.chapter}
        </Text>
        <Text style={[styles.qopen, { color: palette.rasp }]}>Open ›</Text>
      </Pressable>
    );
  };

  const content = (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: inPane ? 8 : insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>Study Queue</Text>
      </View>

      <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }, palette.h2Size != null ? { fontSize: palette.h2Size } : null]}>The Study Queue</Text>
        </View>

        <View style={styles.pipe}>
          <PipeNode label="Write" palette={palette} color={palette.paper2} border={palette.bandBorder} text={palette.raspDeep} />
          <Text style={[styles.pipeArrow, { color: palette.inkFaint }]}>→</Text>
          <PipeNode label="Complete" palette={palette} color={palette.rasp} border={palette.rasp} text="#FFFFFF" strong />
          <Text style={[styles.pipeArrow, { color: palette.inkFaint }]}>→</Text>
          <PipeNode label="ReStudy" palette={palette} color={palette.accentTeal.bg} border={palette.accentTeal.bg} text={palette.accentTeal.deep} />
        </View>

        {/* v313: the drawing's band words — NEXT · TO WRITE and
            CURRENT · TO RE-STUDY (the pipeline's own names for his
            Next and Current lists). */}
        <View style={[styles.bandHead, { backgroundColor: palette.band }]}>
          <Text style={[styles.bandTitle, { color: palette.bandInk }]}>Next · To Write</Text>
          <View style={[styles.bandCountPill, { backgroundColor: palette.paper2 }]}>
            <Text style={[styles.bandCount, { color: palette.ink }]}>{writeQueue.length}</Text>
          </View>
        </View>
        {writeQueue.length ? (
          writeQueue.map((item) => renderItem(item, 'write'))
        ) : (
          <Text style={[styles.empty, { color: palette.inkSoft }]}>Nothing waiting to be written.</Text>
        )}

        {/* v250: the second queue family wears the harmonized teal —
            the two families read apart at a glance. */}
        <View style={[styles.bandHead, { backgroundColor: palette.accentTeal.bg }]}>
          <Text style={[styles.bandTitle, { color: palette.accentTeal.deep }]}>Current · To Re-Study</Text>
          <View style={[styles.bandCountPill, { backgroundColor: palette.paper2 }]}>
            <Text style={[styles.bandCount, { color: palette.ink }]}>{restudyQueue.length}</Text>
          </View>
        </View>
        {restudyQueue.length ? (
          restudyQueue.map((item) => renderItem(item, 'restudy'))
        ) : (
          <Text style={[styles.empty, { color: palette.inkSoft }]}>Nothing waiting to be re-studied.</Text>
        )}

        {/* v265: in the pane, the pane container carries the tab
            bar's clearance once — only the breathing room stays. */}
        <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
      </ScrollView>
      {/* v334: the top fade (his Oct 29 ruling, all pages) — the
          queue dissolves under the Bible palette's paper at the top
          of the scroll view, below the fixed topbar. */}
      <TopFade color={palette.paper} />
      </View>

      {/* v259: same app, same bar — Study is the active slot.
          v265: no per-screen bar in the pane (the shell's stands);
          route mode keeps its bar. */}
      {inPane ? null : <BibleTabBar />}
    </View>
  );

  // v241: same boundary as the Books view — a render failure lands
  // on a visible fallback, never on a blank page.
  const guarded = <BibleScreenBoundary>{content}</BibleScreenBoundary>;
  // v246: screenRoot — a whole screen's paint is never gated on
  // the settle's fade (see components/paper-motion.tsx).
  if (skin === 'paper') return <PaperSettle screenRoot>{guarded}</PaperSettle>;
  if (skin === '8bit') return <BitSettle screenRoot>{guarded}</BitSettle>;
  return guarded;
}

function PipeNode({
  label,
  color,
  border,
  text,
  strong,
}: {
  label: string;
  palette: BiblePalette;
  color: string;
  border: string;
  text: string;
  /** The drawing's Complete node is the one filled, bold node. */
  strong?: boolean;
}) {
  return (
    <View style={[styles.pipeNode, { backgroundColor: color, borderColor: border }]}>
      <Text style={[styles.pipeNodeText, { color: text }, strong ? { fontWeight: '700' } : null]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  page: { paddingHorizontal: 16, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 11, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '700', textAlign: 'center' },
  h2: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6, marginTop: 8, textAlign: 'center' },
  vsub: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 14, paddingHorizontal: 6 },
  pipe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  pipeNode: { borderWidth: 1, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 17 },
  pipeNodeText: { fontSize: 13.5, fontWeight: '600' },
  pipeArrow: { fontSize: 15, fontWeight: '700' },
  pipecount: { textAlign: 'center', fontSize: 12.5, lineHeight: 19, marginTop: 12, paddingHorizontal: 8 },
  bandHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  bandTitle: { fontSize: 12.5, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase' },
  bandCountPill: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 11 },
  bandCount: { fontSize: 13.5, fontWeight: '700' },
  qitem: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 16, paddingHorizontal: 16, marginBottom: 10 },
  qname: { fontSize: 16, fontWeight: '600', flex: 1 },
  qopen: { fontSize: 14, fontWeight: '600' },
  empty: { fontSize: 13.5, fontStyle: 'italic', paddingVertical: 6 },
});
