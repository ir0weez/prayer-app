// ─── Ten Stops card (v501) ──────────────────────────────────────────────────
// The book page's Ten Stops entry — rendered at the top of the
// chapter list, before chapter 1, ONLY for a book with a registry
// entry (lib/ten-stops.ts); every other book's page is untouched.
// His design: the tour is a download, not bundle weight — the card
// is the whole lifecycle in one seat, dressed in the book's own
// colour family (the book palette this screen already derives):
//
//   not downloaded — the tour's title, its length in one line, its
//     size, and a Download button;
//   downloading — a determinate bar (bytes written against the
//     registry's size) and a Cancel that leaves nothing behind;
//   downloaded — Play (into the shared devotional player, as a
//     book-level session) and Remove download, which frees the
//     file and returns the card to its first state, ready to
//     download again;
//   failed — a plain word about it and a Retry.
//
// Whether "downloaded" is true is never a stored flag: on mount
// the card asks the disk (lib/ten-stops-download's refresh — the
// file counts only at the registry's exact byte size).

import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import type { BiblePalette } from './bible-v205/palette';
import { formatTenStopsSize, tenStopsAsDevotional, tenStopsSubline, type TenStops } from '@/lib/ten-stops';
import {
  cancelTenStopsDownload,
  deleteTenStopsDownload,
  refreshTenStopsDownload,
  startTenStopsDownload,
  tenStopsLocalSource,
  useTenStopsDownloadState,
} from '@/lib/ten-stops-download';

export function TenStopsCard(props: { entry: TenStops; palette: BiblePalette }) {
  const { entry, palette: pal } = props;
  const router = useRouter();
  const state = useTenStopsDownloadState(entry);

  // Disk truth on mount (and when the book changes): ready means
  // the complete file is actually there.
  useEffect(() => {
    void refreshTenStopsDownload(entry);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.book]);

  const play = () => {
    const source = tenStopsLocalSource(entry);
    if (!source) return;
    // Load the tour as a book-level session, then open the player
    // route bare — it resolves the session it was just handed. The
    // controller loads LAZILY (native-selectable-text's pattern):
    // it pulls expo-audio's native module in with it, and this
    // card's module must stay importable anywhere the book screen
    // is, tests included.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { openDevotional } = require('../lib/devotional-player') as typeof import('@/lib/devotional-player');
    if (openDevotional(tenStopsAsDevotional(entry), source)) {
      router.push({ pathname: '/devotional', params: {} });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: pal.paper2 }, pal.cardDress]}>
      <View style={styles.head}>
        <View style={[styles.iconChip, { backgroundColor: pal.primCont }]}>
          <MaterialIcons name="explore" size={20} color={pal.raspDeep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: pal.ink }]}>{entry.title}</Text>
          <Text style={[styles.sub, { color: pal.inkSoft }]}>{tenStopsSubline(entry)}</Text>
        </View>
      </View>

      {state.status === 'idle' ? (
        <View style={styles.actionRow}>
          <Text style={[styles.size, { color: pal.inkSoft }]}>{formatTenStopsSize(entry.sizeBytes)}</Text>
          <Pressable
            style={[styles.btn, { backgroundColor: pal.rasp }, pal.btnDress]}
            onPress={() => void startTenStopsDownload(entry)}
            accessibilityLabel={`Download ${entry.title}`}
          >
            <MaterialIcons name="file-download" size={16} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Download</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'downloading' ? (
        <View style={styles.actionRow}>
          <View style={{ flex: 1 }}>
            <View style={[styles.track, { backgroundColor: pal.line }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: pal.rasp, width: `${Math.round(state.fraction * 100)}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: pal.inkSoft }]}>
              Downloading… {Math.round(state.fraction * 100)}%
            </Text>
          </View>
          <Pressable
            style={[styles.btn, { backgroundColor: pal.band }, pal.btnDress]}
            onPress={() => void cancelTenStopsDownload(entry)}
            accessibilityLabel="Cancel the download"
          >
            <Text style={[styles.btnText, { color: pal.raspDeep }]}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'ready' ? (
        <View style={styles.actionRow}>
          <Pressable
            style={[styles.btn, { backgroundColor: pal.rasp }, pal.btnDress]}
            onPress={play}
            accessibilityLabel={`Play ${entry.title}`}
          >
            <MaterialIcons name="play-arrow" size={17} color="#FFFFFF" />
            <Text style={styles.btnPrimaryText}>Play</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { backgroundColor: pal.band }, pal.btnDress]}
            onPress={() => void deleteTenStopsDownload(entry)}
            accessibilityLabel={`Remove the ${entry.title} download`}
          >
            <MaterialIcons name="delete" size={15} color={pal.raspDeep} />
            <Text style={[styles.btnText, { color: pal.raspDeep }]}>Remove download</Text>
          </Pressable>
        </View>
      ) : null}

      {state.status === 'error' ? (
        <View style={styles.actionRow}>
          <Text style={[styles.errorText, { color: pal.raspDeep }]}>{state.message}</Text>
          <Pressable
            style={[styles.btn, { backgroundColor: pal.rasp }, pal.btnDress]}
            onPress={() => void startTenStopsDownload(entry)}
            accessibilityLabel={`Retry downloading ${entry.title}`}
          >
            <Text style={styles.btnPrimaryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 28, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18, marginTop: 18 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginTop: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  size: { flex: 1, fontSize: 13, fontWeight: '600' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  btnPrimaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13.5 },
  btnText: { fontWeight: '600', fontSize: 13.5 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, marginTop: 6 },
  errorText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
});
