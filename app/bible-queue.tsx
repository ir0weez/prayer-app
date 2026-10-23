// ─── v205 Study Queue ────────────────────────────────────────────────────────
// His pipeline, as it stands: Write (his Next list) → Complete →
// ReStudy (his Current list). v206: the lists are built in the app
// (the v205 Notion seeding was cleared by his ruling) and stay editable
// from any chapter's status menu — reading alone never moves a chapter.

import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import type { QueueItem } from '@/lib/bible-v205/types';
import { loadStudyState, type StudyState } from '@/lib/bible-v205/study';
import { Ornament, StatusChip } from '@/components/bible-v205/blocks';
import { useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';

export default function BibleQueueScreen() {
  const router = useRouter();
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  const [studyState, setStudyState] = useState<StudyState | null>(null);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      loadStudyState().then((s) => live && setStudyState(s));
      return () => {
        live = false;
      };
    }, []),
  );

  const writeQueue = studyState?.writeQueue ?? [];
  const restudyQueue = studyState?.restudyQueue ?? [];
  const open = (item: QueueItem) =>
    router.push({ pathname: '/bible-chapter', params: { book: item.book, chapter: String(item.chapter) } });

  const renderItem = (item: QueueItem, kind: 'write' | 'restudy') => (
    <Pressable
      key={`${item.book}-${item.chapter}`}
      style={[styles.qitem, { borderColor: palette.line, backgroundColor: palette.paper }]}
      onPress={() => open(item)}
    >
      <Text style={[styles.qname, { color: palette.ink }]}>
        {item.book} {item.chapter}
      </Text>
      <StatusChip status={kind} palette={palette} />
      <Text style={[styles.qopen, { color: palette.raspDeep }]}>Open ›</Text>
    </Pressable>
  );

  const content = (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>Study Queue</Text>
      </View>

      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.vhead}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>PrayerCircle · Bible</Text>
          <Text style={[styles.h2, { color: palette.ink }]}>The Study Queue</Text>
          <Ornament palette={palette} />
          <Text style={[styles.vsub, { color: palette.inkSoft }]}>
            The pipeline — a chapter is written, it rests complete, and when its turn comes it is read again.
          </Text>
        </View>

        <View style={styles.pipe}>
          <PipeNode label="Write" palette={palette} color={palette.paper} border={palette.rasp} text={palette.raspDeep} />
          <Text style={[styles.pipeArrow, { color: palette.inkFaint }]}>→</Text>
          <PipeNode label="Complete" palette={palette} color={palette.rasp} border={palette.rasp} text="#FFFFFF" />
          <Text style={[styles.pipeArrow, { color: palette.inkFaint }]}>→</Text>
          <PipeNode label="ReStudy" palette={palette} color={palette.band} border="#EFC3D6" text={palette.bandInk} />
        </View>
        <Text style={[styles.pipecount, { color: palette.inkSoft }]}>
          Right now:{' '}
          <Text style={{ color: palette.ink, fontWeight: '800' }}>{writeQueue.length} chapters</Text> waiting to
          write ·{' '}
          <Text style={{ color: palette.ink, fontWeight: '800' }}>{restudyQueue.length} chapters</Text> waiting to
          re-study
        </Text>

        <View style={[styles.bandHead, { backgroundColor: palette.band }]}>
          <Text style={[styles.bandTitle, { color: palette.bandInk }]}>Next · To Write</Text>
          <Text style={[styles.bandCount, { color: palette.bandInk }]}>{writeQueue.length}</Text>
        </View>
        {writeQueue.length ? (
          writeQueue.map((item) => renderItem(item, 'write'))
        ) : (
          <Text style={[styles.empty, { color: palette.inkSoft }]}>Nothing waiting to be written.</Text>
        )}

        <View style={[styles.bandHead, { backgroundColor: palette.band, marginTop: 22 }]}>
          <Text style={[styles.bandTitle, { color: palette.bandInk }]}>Current · To Re-Study</Text>
          <Text style={[styles.bandCount, { color: palette.bandInk }]}>{restudyQueue.length}</Text>
        </View>
        {restudyQueue.length ? (
          restudyQueue.map((item) => renderItem(item, 'restudy'))
        ) : (
          <Text style={[styles.empty, { color: palette.inkSoft }]}>Nothing waiting to be re-studied.</Text>
        )}

        <View
          style={[
            styles.qnote,
            { backgroundColor: palette.calloutPaper, borderColor: palette.greyBorder, borderLeftColor: palette.rasp },
          ]}
        >
          <Text style={[styles.qnoteText, { color: palette.greyInk }]}>
            Both lists are yours, kept here in the app — the <Text style={{ fontWeight: '800' }}>Next</Text> list
            (the notes to write) and the <Text style={{ fontWeight: '800' }}>Current</Text> list (the finished
            chapters queued to read again). Chapters move only when you move them — from a chapter's status
            strip or its book page.
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

function PipeNode({
  label,
  color,
  border,
  text,
}: {
  label: string;
  palette: BiblePalette;
  color: string;
  border: string;
  text: string;
}) {
  return (
    <View style={[styles.pipeNode, { backgroundColor: color, borderColor: border }]}>
      <Text style={[styles.pipeNodeText, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 14.5, fontWeight: '800', flex: 1 },
  page: { paddingHorizontal: 22, paddingBottom: 10 },
  vhead: { alignItems: 'center', paddingTop: 26 },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800', textAlign: 'center' },
  h2: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8, marginTop: 8, textAlign: 'center' },
  vsub: { fontSize: 13.5, lineHeight: 21, textAlign: 'center', marginTop: 14, paddingHorizontal: 6 },
  pipe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  pipeNode: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 15 },
  pipeNodeText: { fontSize: 13, fontWeight: '800' },
  pipeArrow: { fontSize: 15, fontWeight: '700' },
  pipecount: { textAlign: 'center', fontSize: 12.5, lineHeight: 19, marginTop: 12, paddingHorizontal: 8 },
  bandHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginTop: 18, marginBottom: 10 },
  bandTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  bandCount: { fontSize: 13, fontWeight: '800' },
  qitem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 },
  qname: { fontSize: 15, fontWeight: '700', flex: 1 },
  qopen: { fontSize: 13, fontWeight: '800' },
  empty: { fontSize: 13.5, fontStyle: 'italic', paddingVertical: 6 },
  qnote: { borderWidth: 1, borderLeftWidth: 3, borderRadius: 6, paddingVertical: 13, paddingHorizontal: 16, marginTop: 22 },
  qnoteText: { fontSize: 13, lineHeight: 20.5 },
});
