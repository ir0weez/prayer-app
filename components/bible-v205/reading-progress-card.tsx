// ─── v305 reading progress — the Books screen's reading furniture ──────────
// The overall "Bible reading" card (bar + count + the quiet reset
// door) and the per-book reading thread. Both speak the Books
// screen's own Material/Bible language — the book cards' tonal
// surface (paper2 + cardDress, radius 24) and the seed thread
// (rasp over raspTint, 9px). The reading thread is deliberately the
// study thread's slimmer, deeper sibling: 4px, filled with the
// seed's deep step (raspDeep), carrying its own caption, so the two
// tracks read as two tracks at a glance. Pure presentation — the
// counts arrive as props from lib/bible-v205/reading-progress.ts.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BiblePalette } from './palette';

/** The overall card: "Bible reading" over "N of 1,189 chapters
 * read · P%", the seed bar, and the reset door — a quiet text
 * control under the bar whose tap only OPENS the confirmation (the
 * screen owns the modal); it clears nothing by itself. */
export function ReadingProgressCard({
  read,
  total,
  palette,
  onResetPress,
}: {
  read: number;
  total: number;
  palette: BiblePalette;
  onResetPress: () => void;
}) {
  const pct = total ? Math.round((100 * read) / total) : 0;
  const barPct = total ? (100 * read) / total : 0;
  return (
    <View style={[styles.card, { backgroundColor: palette.paper2 }, palette.cardDress]}>
      <View style={styles.cardTop}>
        <Text style={[styles.cardTitle, { color: palette.ink }]}>Bible reading</Text>
        <Text style={[styles.cardCount, { color: palette.inkSoft }]} numberOfLines={1}>
          {`${read} of ${total.toLocaleString('en-US')} chapters read · ${pct}%`}
        </Text>
      </View>
      <View style={[styles.thread, { backgroundColor: palette.raspTint }]}>
        <View style={[styles.threadFill, { backgroundColor: palette.rasp, width: `${barPct}%` }]} />
      </View>
      <Pressable
        onPress={onResetPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Reset reading progress"
        style={styles.resetBtn}
      >
        <Text style={[styles.resetText, { color: palette.raspDeep }]}>Reset reading progress</Text>
      </Pressable>
    </View>
  );
}

/** One book's reading thread: a slim 4px bar in the seed's deep step
 * with its own quiet caption ("N of M read"). A book with no read
 * chapters shows the empty thread; a fully read book reads full. */
export function BookReadingThread({
  read,
  total,
  palette,
}: {
  read: number;
  total: number;
  palette: BiblePalette;
}) {
  const barPct = total ? (100 * read) / total : 0;
  return (
    <View style={styles.threadRow}>
      <View style={[styles.readThread, { backgroundColor: palette.raspTint }]}>
        <View style={[styles.readThreadFill, { backgroundColor: palette.raspDeep, width: `${barPct}%` }]} />
      </View>
      <Text style={[styles.threadCount, { color: palette.inkSoft }]} numberOfLines={1}>
        {`${read} of ${total} read`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // A book card's dress: same radius, padding, and tonal surface.
  card: { borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, gap: 8 },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  cardCount: { fontSize: 12, flexShrink: 1, textAlign: 'right' },
  thread: { height: 9, borderRadius: 999, overflow: 'hidden', position: 'relative' },
  threadFill: { height: 9, borderRadius: 999 },
  resetBtn: { alignSelf: 'flex-start', paddingVertical: 2 },
  resetText: { fontSize: 12, fontWeight: '700' },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readThread: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  readThreadFill: { height: 4, borderRadius: 999 },
  threadCount: { fontSize: 10.5, fontWeight: '600' },
});
