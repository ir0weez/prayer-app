// ─── Download all bar (v527) ────────────────────────────────────────────────
// The book page's whole-book devotional download — Jonathan's ask
// (Nov 14): a "Download All" function for a whole book's
// devotionals. It sits at the TOP of the chapter list, directly
// beneath the Ten Stops card (in that same seat for a book with
// no tour): a full-width filled tonal bar in the book's own colour
// family, flat like the rest of the page — no hard shadow.
//
//   not all here — the download icon, "Download all", and the
//     book's total devotional size; a tap fetches every chapter
//     not already on disk, in chapter order;
//   downloading — the aggregate progress (bytes landed against
//     the book's whole set) and a Cancel, in the same seat;
//     chapters already landed stay landed;
//   all here — "Downloaded" with the total size and a remove
//     affordance that frees every chapter of the book;
//   failed — a plain word about it and a Retry.
//
// Whether a chapter is downloaded is never a stored flag: on
// mount the bar asks the disk for the whole book
// (lib/devotional-download's refresh — a file counts only at the
// registry's exact byte size). A book with no registered
// devotionals renders nothing at all: no dead door.
//
// ─── v533 — the naming header (Concept 3, his pick Nov 15) ────
// The bar alone never said WHAT "all" was. Directly above it now
// stands a quiet section header in the same seat: "Devotionals"
// in small letterspaced caps in the book's own colour family,
// and at the right the book's disk truth in words — "N of M on
// this phone", read off the same progress the bar reads, so the
// count follows chapters as they land and stands in every state
// the bar stands in. The bar itself keeps its v527 wording and
// dress in every state, untouched.

import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { BiblePalette } from './bible-v205/palette';
import { devotionalsForBook } from '@/lib/devotionals';
import { formatTenStopsSize } from '@/lib/ten-stops';
import {
  cancelBookDevotionalDownload,
  deleteBookDevotionalDownloads,
  devotionalOnPhoneLabel,
  refreshBookDevotionalDownloads,
  startBookDevotionalDownload,
  useBookDevotionalDownloadState,
  useBookDevotionalProgress,
} from '@/lib/devotional-download';

export function DevotionalDownloadAllBar(props: { book: string; palette: BiblePalette }) {
  const { book, palette: pal } = props;
  const progress = useBookDevotionalProgress(book);
  const run = useBookDevotionalDownloadState(book);

  // Disk truth on mount (and when the book changes): ready means
  // the complete files are actually there.
  useEffect(() => {
    void refreshBookDevotionalDownloads(book);
  }, [book]);

  if (devotionalsForBook(book).length === 0) return null;

  const totalSize = formatTenStopsSize(progress.totalBytes);

  // v533: the naming header stands over the bar in every state —
  // the label in the book's own family (raspDeep, the same deep
  // role the bar's words wear), the count in the quiet grey.
  const header = (
    <View style={styles.header}>
      <Text style={[styles.headerLabel, { color: pal.raspDeep }]}>Devotionals</Text>
      <Text style={[styles.headerCount, { color: pal.inkSoft }]}>
        {devotionalOnPhoneLabel(progress)}
      </Text>
    </View>
  );

  let bar: ReactNode;

  if (run.status === 'downloading') {
    bar = (
      <View style={[styles.bar, { backgroundColor: pal.primCont }]}>
        <MaterialIcons name="file-download" size={20} color={pal.raspDeep} />
        <View style={{ flex: 1 }}>
          <View style={[styles.track, { backgroundColor: pal.line }]}>
            <View
              style={[
                styles.fill,
                { backgroundColor: pal.rasp, width: `${Math.round(run.fraction * 100)}%` },
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: pal.raspDeep }]}>
            Downloading… {Math.round(run.fraction * 100)}%
          </Text>
        </View>
        <Pressable
          onPress={() => void cancelBookDevotionalDownload(book)}
          hitSlop={8}
          accessibilityLabel="Cancel the download"
        >
          <Text style={[styles.actionText, { color: pal.raspDeep }]}>Cancel</Text>
        </Pressable>
      </View>
    );
  } else if (run.status === 'error') {
    bar = (
      <View style={[styles.bar, { backgroundColor: pal.primCont }]}>
        <Text style={[styles.errorText, { color: pal.raspDeep }]}>{run.message}</Text>
        <Pressable
          onPress={() => void startBookDevotionalDownload(book)}
          hitSlop={8}
          accessibilityLabel={`Retry downloading all ${book} devotionals`}
        >
          <Text style={[styles.actionText, { color: pal.raspDeep }]}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (progress.allDownloaded) {
    bar = (
      <View style={[styles.bar, { backgroundColor: pal.primCont }]}>
        <MaterialIcons name="check-circle" size={20} color={pal.raspDeep} />
        <Text style={[styles.label, { color: pal.raspDeep }]}>Downloaded</Text>
        <Text style={[styles.size, { color: pal.raspDeep }]}>{totalSize}</Text>
        <Pressable
          onPress={() => void deleteBookDevotionalDownloads(book)}
          hitSlop={8}
          accessibilityLabel={`Remove all ${book} devotional downloads`}
        >
          <MaterialIcons name="delete-outline" size={19} color={pal.raspDeep} />
        </Pressable>
      </View>
    );
  } else {
    bar = (
      <Pressable
        style={[styles.bar, { backgroundColor: pal.primCont }]}
        onPress={() => void startBookDevotionalDownload(book)}
        accessibilityLabel={`Download all ${book} devotionals`}
      >
        <MaterialIcons name="file-download" size={20} color={pal.raspDeep} />
        <Text style={[styles.label, { color: pal.raspDeep }]}>Download all</Text>
        <Text style={[styles.size, { color: pal.raspDeep }]}>{totalSize}</Text>
      </Pressable>
    );
  }

  return (
    <>
      {header}
      {bar}
    </>
  );
}

const styles = StyleSheet.create({
  // v533: the header carries the seat's top margin (the bar's
  // old marginTop) and the 7px breath the drawing puts between
  // the header and the bar; the bar itself no longer sets one.
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 7,
  },
  headerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.8, textTransform: 'uppercase' },
  headerCount: { marginLeft: 'auto', fontSize: 12 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  label: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  size: { fontSize: 13, fontWeight: '600' },
  actionText: { fontSize: 13.5, fontWeight: '700' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  progressText: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  errorText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
});
