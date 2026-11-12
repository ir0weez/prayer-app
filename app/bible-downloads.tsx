// ─── v502 Downloaded audio ──────────────────────────────────────────────────
// The Downloads page (Jonathan, Nov 11 — downloaded-audio-on-
// study-v4.html, "Love this. Build it."): everything the phone
// has pulled down, in one list, reached from the Books screen's
// Downloaded audio card. What's here is DISK TRUTH and nothing
// else — lib/downloads.ts reads the v501 Ten Stops registry
// against the files themselves, so a row stands only while its
// file is verified on the phone at the registry's size.
//
// The drawing, kept: a storage card up top ("{total} used by
// downloads", a bar SEGMENTED per item — each slice in that
// item's book colour, its width the item's share of the whole —
// and the item count); the groups in their order, TEN STOPS
// TOURS then YOUR COMMENTARY · YOUR VOICE; every row wearing its
// own book's ROYGBIV family (disc in the tint with the deep tone
// on it, the kind tag in the same tints, the play button in the
// book's primary). Play opens the SAME book-level devotional
// session the book page's Play opens. The bin removes only the
// phone copy — the foot of the page says so in his drawing's
// words — and Remove all clears the shelf the same way.
//
// The Your Voice group stands with its empty line: no own-voice
// downloads exist yet (that work is its own, later), so the
// group is structural — it fills when his recordings do.

import { useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { BiblePaneNav } from '@/lib/bible-pane';
import { useSkin } from '@/hooks/use-skin';
import { PaperSettle } from '@/components/paper-motion';
import { BitSettle } from '@/components/bit-motion';
import { useBiblePalette, type BiblePalette } from '@/components/bible-v205/palette';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';
import { bookColorsFor, type BookColors } from '@/lib/bible-v205/book-colors';
import {
  downloadDiscCode,
  downloadKindLabel,
  downloadRowMeta,
  downloadsPageModel,
  refreshDownloads,
  removeAllDownloads,
  removeDownload,
  useDownloadedAudio,
  type DownloadedAudioItem,
} from '@/lib/downloads';
import { tenStopsAsDevotional } from '@/lib/ten-stops';
import { tenStopsLocalSource } from '@/lib/ten-stops-download';

/** The drawing's removal red (the Material error the app
 * already speaks for destructive marks). */
const REMOVE_RED = '#B3261E';

/** v265: pane mode (the shell's Study tab) hands this screen the
 * pane's focus flag and navigation callbacks; route mode (a deep
 * link's landing shell) keeps the router. */
export interface BibleDownloadsPaneProps {
  nav: BiblePaneNav;
  focused: boolean;
}

export default function BibleDownloadsScreen(props: { pane?: BibleDownloadsPaneProps } = {}) {
  const router = useRouter();
  const inPane = !!props.pane;
  // v207: top safe-area inset, as the rest of the app applies.
  const insets = useSafeAreaInsets();
  const palette = useBiblePalette();
  const { skin } = useSkin();
  // v259: the app tab bar rides over this screen (Study active).
  const tabBarHeight = useTabBarOccupiedHeight();
  const items = useDownloadedAudio();
  const model = downloadsPageModel(items);

  // The list is disk truth, re-asked whenever the page becomes
  // the visible one — a download finished on a book page, or a
  // removal made here a moment ago, is simply what the disk says.
  const reloadDownloads = useCallback(() => {
    void refreshDownloads();
  }, []);
  useFocusEffect(
    useCallback(() => {
      // v265: pane focus is the pane's own flag (below).
      if (inPane) return;
      reloadDownloads();
    }, [inPane, reloadDownloads]),
  );
  const paneFocused = props.pane?.focused ?? false;
  useEffect(() => {
    if (!inPane || !paneFocused) return;
    reloadDownloads();
  }, [inPane, paneFocused, reloadDownloads]);

  const goBack = () => {
    if (props.pane) props.pane.nav.back();
    else router.back();
  };

  const play = (item: DownloadedAudioItem) => {
    const source = tenStopsLocalSource(item.entry);
    if (!source) return;
    // The v501 book-page Play, unchanged: the tour loads as a
    // book-level session from its local file, then the player
    // route opens bare and resolves the session it was handed.
    // The controller loads LAZILY (the Ten Stops card's pattern):
    // it pulls expo-audio's native module in with it, and this
    // screen's module must stay importable anywhere, tests
    // included.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { openDevotional } = require('../lib/devotional-player') as typeof import('@/lib/devotional-player');
    if (openDevotional(tenStopsAsDevotional(item.entry), source)) {
      router.push({ pathname: '/devotional', params: {} });
    }
  };

  const renderItem = (item: DownloadedAudioItem) => {
    // v420: the row wears its book's own family — disc, tag and
    // play button all derive from the book's spectrum hue.
    const colors = bookColorsFor(item.entry.book, palette.isDark) ?? FALLBACK_COLORS;
    return (
      <View
        key={item.entry.book}
        style={[styles.item, { backgroundColor: palette.paper2 }, palette.cardDress, { borderRadius: 18 }]}
      >
        <View style={[styles.disc, { backgroundColor: colors.tintA }]}>
          <Text style={[styles.discText, { color: colors.deep }]}>{downloadDiscCode(item.entry.book)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemTitle, { color: palette.ink }]}>{item.entry.title}</Text>
          <Text style={[styles.itemMeta, { color: palette.inkSoft }]}>{downloadRowMeta(item)}</Text>
        </View>
        <View style={[styles.kindTag, { backgroundColor: colors.tintA }]}>
          <Text style={[styles.kindText, { color: colors.deep }]}>{downloadKindLabel(item)}</Text>
        </View>
        <Pressable
          onPress={() => play(item)}
          hitSlop={6}
          style={[styles.playBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={`Play ${item.entry.title}`}
        >
          <MaterialIcons name="play-arrow" size={18} color="#FFFFFF" />
        </Pressable>
        <Pressable
          onPress={() => void removeDownload(item)}
          hitSlop={8}
          style={styles.trashBtn}
          accessibilityRole="button"
          accessibilityLabel={`Remove the ${item.entry.title} download`}
        >
          <MaterialIcons name="delete-outline" size={19} color={REMOVE_RED} />
        </Pressable>
      </View>
    );
  };

  const content = (
    <View style={[{ flex: 1, backgroundColor: palette.paper }, palette.screenDress]}>
      <View style={[styles.topbar, { borderBottomColor: palette.line, paddingTop: inPane ? 8 : insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={10} style={{ padding: 2 }}>
          <MaterialIcons name="arrow-back" size={21} color={palette.ink} />
        </Pressable>
        <Text style={[styles.topTitle, { color: palette.ink }]}>Downloaded audio</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}>
          <Text style={[styles.secLabel, { color: palette.inkSoft, marginTop: 20 }]}>On this phone</Text>
          <View style={[styles.meterCard, { backgroundColor: palette.paper2 }, palette.cardDress]}>
            <Text style={[styles.meterTitle, { color: palette.ink }]}>{model.totalLine}</Text>
            <View style={[styles.meter, { backgroundColor: palette.line }]}>
              {model.segments.map((seg) => {
                const colors = bookColorsFor(seg.book, palette.isDark) ?? FALLBACK_COLORS;
                return (
                  <View
                    key={seg.book}
                    style={{ height: '100%', width: `${seg.fraction * 100}%`, backgroundColor: colors.primary }}
                  />
                );
              })}
            </View>
            <Text style={[styles.itemMeta, { color: palette.inkSoft, marginTop: 7 }]}>{model.countLine}</Text>
          </View>

          {model.groups.map((group) => (
            <View key={group.id}>
              <Text style={[styles.secLabel, { color: palette.inkSoft }]}>{group.label}</Text>
              {group.items.length
                ? group.items.map(renderItem)
                : group.emptyLine
                  ? <Text style={[styles.emptyLine, { color: palette.inkSoft }]}>{group.emptyLine}</Text>
                  : null}
            </View>
          ))}

          <Text style={[styles.foot, { color: palette.inkSoft }]}>{model.footerLine}</Text>
          {items.length ? (
            <Pressable
              onPress={() => void removeAllDownloads()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Remove all downloads"
            >
              <Text style={styles.removeAll}>Remove all downloads</Text>
            </Pressable>
          ) : null}

          {/* v265: in the pane, the pane container carries the tab
              bar's clearance once — only the breathing room stays. */}
          <View style={{ height: inPane ? 27 : tabBarHeight + 27 }} />
        </ScrollView>
        {/* v342: no top fade — detail screen with a definite
            header (fade scope ruling, Oct 29), as the queue. */}
      </View>

      {/* v259: same app, same bar — Study is the active slot.
          v265: no per-screen bar in the pane (the shell's stands);
          route mode keeps its bar. */}
      {inPane ? null : <BibleTabBar />}
    </View>
  );

  // v241: same boundary as the sibling screens — a render failure
  // lands on a visible fallback, never on a blank page.
  const guarded = <BibleScreenBoundary>{content}</BibleScreenBoundary>;
  // v246: screenRoot — a whole screen's paint is never gated on
  // the settle's fade (see components/paper-motion.tsx).
  if (skin === 'paper') return <PaperSettle screenRoot>{guarded}</PaperSettle>;
  if (skin === '8bit') return <BitSettle screenRoot>{guarded}</BitSettle>;
  return guarded;
}

// A registry book is always a canon book, so its family always
// resolves; this fallback exists only so a future registry entry
// with a name outside the canon degrades to a dressed row
// (Hebrews' violet) instead of an exception.
const FALLBACK_COLORS: BookColors = bookColorsFor('Hebrews', false)!;

const styles = StyleSheet.create({
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 9, borderBottomWidth: 1 },
  topTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  page: { paddingHorizontal: 16, paddingBottom: 10 },
  secLabel: { fontSize: 12, letterSpacing: 1.8, textTransform: 'uppercase', fontWeight: '700', marginTop: 26, marginBottom: 10 },
  meterCard: { borderRadius: 22, paddingVertical: 15, paddingHorizontal: 16 },
  meterTitle: { fontSize: 14.5, fontWeight: '800' },
  meter: { height: 9, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginTop: 9 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 13, marginBottom: 9 },
  disc: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  discText: { fontSize: 13, fontWeight: '800' },
  itemTitle: { fontSize: 15, fontWeight: '800' },
  itemMeta: { fontSize: 12.5, fontWeight: '600', marginTop: 1 },
  kindTag: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 },
  kindText: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  playBtn: { width: 37, height: 37, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  trashBtn: { padding: 4 },
  emptyLine: { fontSize: 13.5, paddingVertical: 2 },
  foot: { fontSize: 12.5, lineHeight: 19, marginTop: 22 },
  removeAll: { textAlign: 'center', fontSize: 14, fontWeight: '800', color: REMOVE_RED, marginTop: 14, paddingVertical: 4 },
});
