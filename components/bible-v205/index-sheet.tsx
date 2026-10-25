// ─── v205 verse index sheet ──────────────────────────────────────────────────
// One sheet, three doors (Verses FAB, grid icon, magnifier) — the
// two-second tool from the approved mockup. The grid reads the live
// chapter every time it opens: a verse wears ✦ when it carries a
// Highlight, ♥ when it is kept, • when it carries a cross-reference.
// Search answers Highlight-first and falls back to the scripture text.

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  browseCategory,
  flattenEntries,
  parseRefQuery,
  searchChapter,
  type DisplaySection,
} from '@/lib/bible-v205/index';
import { entryKey, type NoteCategory } from '@/lib/bible-v205/types';
import { NOTE_CATEGORIES } from '@/lib/bible-v205/categories';
import { rangeLabel, type BiblePalette } from './palette';

export interface IndexSheetProps {
  visible: boolean;
  focusSearch: boolean;
  book: string;
  chapter: number;
  sections: DisplaySection[];
  verses: { verse: number; text: string }[];
  /** entryKey -> { kept, hasHighlight, hasScripture, category } */
  entryStatus: Map<string, { kept: boolean; hasHighlight: boolean; hasScripture: boolean; category: NoteCategory | null }>;
  /** entryKey -> his in-app category mark (for category browse). */
  userCategories: Map<string, NoteCategory | null>;
  palette: BiblePalette;
  onClose: () => void;
  onLand: (verse: number) => void;
}

function BoldTerms({ text, terms, palette }: { text: string; terms: string[]; palette: BiblePalette }) {
  if (!terms.length) return <Text style={[styles.rtxt, { color: palette.ink }]}>{text}</Text>;
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'ig');
  const parts = text.split(pattern);
  return (
    <Text style={[styles.rtxt, { color: palette.ink }]}>
      {parts.map((part, i) =>
        terms.some((t) => part.toLowerCase() === t) ? (
          <Text key={i} style={{ color: palette.raspDeep, fontWeight: '700' }}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        ),
      )}
    </Text>
  );
}

export function IndexSheet(props: IndexSheetProps) {
  const { palette, sections, verses, book, chapter } = props;
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<NoteCategory | null>(null);
  const verseCount = verses.length ? verses[verses.length - 1].verse : 0;

  const flat = useMemo(() => flattenEntries(sections), [sections]);
  const entryForVerse = (v: number) => flat.find((f) => v >= f.entry.start && v <= f.entry.end)?.entry ?? null;

  const refTarget = query.trim() ? parseRefQuery(query, verseCount) : null;
  const hits = useMemo(
    () => (query.trim() && refTarget === null ? searchChapter(sections, verses, query) : []),
    [query, refTarget, sections, verses],
  );
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  // Category browse: his color code as its own search class. With a
  // word query too, the class narrows to lines carrying the words.
  const categoryHits = useMemo(() => {
    if (!category) return [];
    const all = browseCategory(sections, verses, book, chapter, category, props.userCategories);
    if (!terms.length || refTarget !== null) return all;
    return all.filter((h) => terms.every((t) => h.display.toLowerCase().includes(t)));
  }, [category, sections, verses, book, chapter, props.userCategories, terms, refTarget]);

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}>
      <Pressable style={styles.scrim} onPress={props.onClose} />
      <View style={[styles.sheet, { backgroundColor: palette.paper }, palette.sheetDress]}>
        <View style={[styles.handle, { backgroundColor: palette.lineDark }]} />
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: palette.ink }]}>
            {book} {chapter}
            <Text style={[styles.sheetSub, { color: palette.inkSoft }]}>  chapter index</Text>
          </Text>
          <Pressable onPress={props.onClose} hitSlop={8}>
            <MaterialIcons name="close" size={20} color={palette.inkSoft} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            style={[styles.searchInput, { borderColor: palette.lineDark, backgroundColor: palette.paper2, color: palette.ink }]}
            placeholder="Search your notes — or type a verse…"
            placeholderTextColor={palette.inkFaint}
            value={query}
            onChangeText={setQuery}
            autoFocus={props.focusSearch}
            returnKeyType="search"
          />
        </View>

        <View style={styles.legend}>
          <Text style={[styles.legendItem, { color: palette.inkSoft }]}>
            <Text style={{ color: palette.hlMark, fontWeight: '800' }}>✦</Text> Highlight
          </Text>
          <Text style={[styles.legendItem, { color: palette.inkSoft }]}>
            <Text style={{ color: palette.rose, fontWeight: '800' }}>♥</Text> Kept
          </Text>
          <Text style={[styles.legendItem, { color: palette.inkSoft }]}>
            <Text style={{ color: palette.raspDeep, fontWeight: '800' }}>•</Text> Cross-reference
          </Text>
          <Text style={[styles.legendItem, { color: palette.inkSoft }]}>
            Search leads with <Text style={{ color: palette.ink, fontWeight: '700' }}>your Highlights</Text>
          </Text>
        </View>

        <View style={styles.catFilterRow}>
          <Pressable
            style={[styles.catFilter, !category ? { backgroundColor: palette.rasp, borderColor: palette.rasp } : { borderColor: palette.lineDark }]}
            onPress={() => setCategory(null)}
          >
            <Text style={[styles.catFilterText, { color: !category ? '#FFFFFF' : palette.inkSoft }]}>All</Text>
          </Pressable>
          {NOTE_CATEGORIES.map((meta) => {
            const active = category === meta.id;
            return (
              <Pressable
                key={meta.id}
                style={[styles.catFilter, { borderColor: active ? meta.color : palette.line, backgroundColor: active ? meta.bg : palette.paper }]}
                onPress={() => setCategory(active ? null : meta.id)}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: meta.color }} />
                <Text style={[styles.catFilterText, { color: active ? meta.ink : palette.inkSoft }]}>{meta.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
          {category
            ? categoryHits.map((hit, i) => (
                <Pressable
                  key={`cat-${hit.entry.start}-${i}`}
                  style={[styles.sres, { backgroundColor: palette.raspTint, borderColor: palette.bandLine }, palette.cardDress]}
                  onPress={() => props.onLand(hit.entry.start)}
                >
                  <Text style={[styles.refchip, { backgroundColor: palette.band, color: palette.bandInk }]}>
                    {rangeLabel(hit.entry.start, hit.entry.end)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rtxt, { color: palette.ink }]}>{hit.display}</Text>
                    <Text style={[styles.rsub, { color: palette.inkSoft }]}>
                      {NOTE_CATEGORIES.find((c) => c.id === category)?.phrase} — tap to land
                    </Text>
                  </View>
                </Pressable>
              ))
            : null}
          {category && categoryHits.length === 0 ? (
            <Text style={[styles.nores, { color: palette.inkSoft }]}>Nothing in this chapter carries that mark yet.</Text>
          ) : null}
          {refTarget !== null && refTarget > 0 ? (
            <Pressable
              style={[styles.sres, styles.sresGoto, { borderColor: palette.rasp, backgroundColor: palette.paper }]}
              onPress={() => props.onLand(refTarget)}
            >
              <Text style={[styles.refchip, { backgroundColor: palette.band, color: palette.bandInk }]}>Ver. {refTarget}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rtxt, { color: palette.ink }]}>Go to verse {refTarget}</Text>
                <Text style={[styles.rsub, { color: palette.inkSoft }]}>
                  {(() => { const e = entryForVerse(refTarget); return e ? rangeLabel(e.start, e.end) : ''; })()}
                </Text>
              </View>
            </Pressable>
          ) : null}
          {refTarget === -1 ? (
            <Text style={[styles.nores, { color: palette.inkSoft }]}>
              Chapter {chapter} runs Ver. 1–{verseCount} — no verse {query.trim()} here.
            </Text>
          ) : null}
          {query.trim() && refTarget === null
            ? hits.map((hit, i) => (
                <Pressable
                  key={`${hit.entry.start}-${i}`}
                  style={[styles.sres, { backgroundColor: palette.raspTint, borderColor: palette.bandLine }, palette.cardDress]}
                  onPress={() => props.onLand(hit.entry.start)}
                >
                  <Text style={[styles.refchip, { backgroundColor: palette.band, color: palette.bandInk }]}>
                    {rangeLabel(hit.entry.start, hit.entry.end)}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <BoldTerms text={hit.display} terms={terms} palette={palette} />
                    <Text style={[styles.rsub, { color: palette.inkSoft }]}>
                      {hit.tier === 'highlight'
                        ? '✦ Your Highlight — tap to land'
                        : hit.tier === 'thought'
                          ? 'Main Thought'
                          : hit.tier === 'scripture'
                            ? 'In the verse itself'
                            : (hit.sectionTitle ?? '')}
                    </Text>
                  </View>
                </Pressable>
              ))
            : null}
          {query.trim() && refTarget === null && hits.length === 0 ? (
            <Text style={[styles.nores, { color: palette.inkSoft }]}>Nothing in your notes matches that — yet.</Text>
          ) : null}

          <Text style={[styles.gridLabel, { color: palette.inkSoft }]}>All verses — tap to land</Text>
          <View style={styles.grid}>
            {verses.map((v) => {
              const entry = entryForVerse(v.verse);
              const key = entry ? entryKey(book, chapter, entry.start, entry.end) : '';
              const st = props.entryStatus.get(key);
              return (
                <Pressable
                  key={v.verse}
                  style={[styles.vcell, palette.frameDress, { backgroundColor: palette.paper2, borderColor: palette.line }]}
                  onPress={() => props.onLand(v.verse)}
                >
                  <Text style={[styles.vn, { color: palette.ink }]}>{v.verse}</Text>
                  <View style={styles.vm}>
                    {st?.hasHighlight ? <Text style={{ color: palette.hlMark, fontSize: 10, fontWeight: '800' }}>✦</Text> : null}
                    {st?.kept ? <Text style={{ color: palette.rose, fontSize: 10, fontWeight: '800' }}>♥</Text> : null}
                    {st?.hasScripture ? <Text style={{ color: palette.raspDeep, fontSize: 13, fontWeight: '800', lineHeight: 8 }}>•</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ height: 12 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '84%',
    borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  sheetSub: { fontWeight: '500', fontSize: 12.5 },
  searchRow: { marginTop: 12 },
  searchInput: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 13, fontSize: 15 },
  legend: { flexDirection: 'row', gap: 13, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' },
  legendItem: { fontSize: 11.5 },
  catFilterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  catFilter: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 },
  catFilterText: { fontSize: 11, fontWeight: '700' },
  results: { marginTop: 4 },
  sres: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8 },
  sresGoto: { borderWidth: 1.5 },
  refchip: { fontWeight: '800', fontSize: 11.5, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, overflow: 'hidden', marginTop: 1 },
  rtxt: { fontSize: 13.5, lineHeight: 20 },
  rsub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  nores: { fontSize: 13, paddingVertical: 8, paddingHorizontal: 2 },
  gridLabel: { marginTop: 16, fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  vcell: { width: '12.6%', borderWidth: 1, borderRadius: 10, paddingTop: 8, paddingBottom: 6, alignItems: 'center', gap: 1 },
  vn: { fontSize: 16.5, fontWeight: '700', lineHeight: 19 },
  vm: { height: 13, flexDirection: 'row', gap: 3, alignItems: 'center' },
});
