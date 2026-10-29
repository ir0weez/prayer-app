// ─── v305 reading progress — the Books screen's reading furniture ──────────
// v325 supersedes the v305 overall "Bible reading" card with the
// approved Study progress header (study-progress-concepts-v3.html,
// Concept 3 — Two Structured Rows, picked 2026-10-28 22:21): one
// tonal radius-24 card carrying BOTH tracks as two structured rows,
// their book counts and remainders as its footer, and the quiet
// reset line directly underneath. The per-book reading thread below
// is unchanged. Pure presentation — every count arrives as props
// from lib/bible-v205/rewards.ts (studyProgressTotals), which counts
// the v228 read track and the v324 written union rule.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StudyProgressTotals } from '@/lib/bible-v205/rewards';
import { WavyProgress } from '@/components/wavy-progress';
import type { BiblePalette } from './palette';

const formatCount = (n: number) => n.toLocaleString('en-US');

/** One of the header's two tracks, at Concept 3's measure: the caps
 * label and percentage in the track's family colour, the chapter
 * count at 26/800 with its quiet "of N chapters", and the track's
 * 6px thread filled to the track's exact share. */
function StudyProgressRow({
  label,
  count,
  total,
  labelColor,
  trackColor,
  fillColor,
  inkColor,
  quietColor,
  lineColor,
  divided,
}: {
  label: string;
  count: number;
  total: number;
  labelColor: string;
  trackColor: string;
  fillColor: string;
  inkColor: string;
  quietColor: string;
  lineColor: string;
  divided?: boolean;
}) {
  const pct = total ? Math.round((100 * count) / total) : 0;
  const share = total ? (100 * count) / total : 0;
  return (
    <View
      style={[
        styles.progressRow,
        divided ? styles.progressRowDivided : null,
        divided ? { borderTopColor: lineColor } : null,
      ]}
    >
      <View style={styles.progressRowTop}>
        <View>
          <Text style={[styles.progressCap, { color: labelColor }]}>{label}</Text>
          <View style={styles.progressNumberLine}>
            <Text style={[styles.progressNumber, { color: inkColor }]}>{formatCount(count)}</Text>
            <Text style={[styles.progressOf, { color: quietColor }]}>{` of ${formatCount(total)} chapters`}</Text>
          </View>
        </View>
        <Text style={[styles.progressPct, { color: labelColor }]}>{`${pct}%`}</Text>
      </View>
      {/* v339: the thread wears the wavy fill (his Oct 29 ruling) in
          the track's own colours — same seat, same share. */}
      <View style={styles.progressThread}>
        <WavyProgress value={share / 100} color={fillColor} trackColor={trackColor} height={8} />
      </View>
    </View>
  );
}

/** The Books page's progress header — Concept 3, verbatim in
 * structure: the WRITTEN row over the READ row in one tonal card,
 * the two-line footer (books, then remainders), and the reset line
 * under the card. The reset only OPENS the screen's confirmation
 * (the screen owns the modal); it clears nothing by itself, and the
 * reset it leads to still clears only the read track. Both family
 * colours are palette roles derived from the active seed — the
 * written track wears the harmonized accent family, the read track
 * the seed family itself. */
export function StudyProgressHeader({
  progress,
  palette,
  onResetPress,
}: {
  progress: StudyProgressTotals;
  palette: BiblePalette;
  onResetPress: () => void;
}) {
  const writtenTone = palette.accentAmber;
  return (
    <View>
      <View
        style={[
          styles.progressCard,
          { backgroundColor: palette.paper2 },
          palette.cardDress,
          styles.progressCardRadius,
        ]}
      >
        <StudyProgressRow
          label="WRITTEN"
          count={progress.writtenChapters}
          total={progress.totalChapters}
          labelColor={writtenTone.deep}
          trackColor={writtenTone.bg}
          fillColor={writtenTone.hue}
          inkColor={palette.ink}
          quietColor={palette.inkSoft}
          lineColor={palette.line}
        />
        <StudyProgressRow
          label="READ"
          count={progress.readChapters}
          total={progress.totalChapters}
          labelColor={palette.raspDeep}
          trackColor={palette.raspTint}
          fillColor={palette.rasp}
          inkColor={palette.ink}
          quietColor={palette.inkSoft}
          lineColor={palette.line}
          divided
        />
        <View style={[styles.progressFooter, { borderTopColor: palette.line }]}>
          <Text style={[styles.progressFooterText, { color: palette.inkSoft }]}>
            {`${formatCount(progress.writtenBooks)} of ${formatCount(progress.totalBooks)} books written · ${formatCount(progress.readBooks)} of ${formatCount(progress.totalBooks)} books read`}
          </Text>
          <Text style={[styles.progressFooterText, { color: palette.inkSoft }]}>
            {`${formatCount(progress.chaptersToWrite)} to write · ${formatCount(progress.chaptersToRead)} to read`}
          </Text>
        </View>
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
      {/* v342 (his ruling, Oct 29 14:46): the per-book reading
          thread is a RECORD bar — v341's wavy conversion reverted
          to its pre-v341 straight form. Only the Study header's
          two threads at the top of the Books page stay wavy. */}
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
  // Concept 3's measure, taken from the approved drawing: the card
  // itself carries only the radius — its 28px cardDress radius is
  // overridden back to the drawing's 24 after the dress spreads.
  progressCard: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 8 },
  progressCardRadius: { borderRadius: 24 },
  progressRow: { paddingTop: 7, paddingBottom: 4 },
  progressRowDivided: { borderTopWidth: 1 },
  progressRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  progressCap: { fontSize: 10, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase' },
  progressNumberLine: { flexDirection: 'row', alignItems: 'baseline' },
  progressNumber: { fontSize: 26, fontWeight: '800', lineHeight: 29, marginTop: 1 },
  progressOf: { fontSize: 13, fontWeight: '600' },
  progressPct: { fontSize: 20, fontWeight: '800' },
  progressThread: { marginTop: 6 },
  progressFooter: { borderTopWidth: 1, paddingTop: 7 },
  progressFooterText: { fontSize: 11.5, lineHeight: 17, fontWeight: '500' },
  // The reset line sits under the card, exactly as drawn — a quiet
  // 13px text control in the seed's deep step.
  resetBtn: { alignSelf: 'flex-start', paddingVertical: 2, marginTop: 11, marginLeft: 2 },
  resetText: { fontSize: 13, fontWeight: '600' },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  readThread: { flex: 1, height: 4, borderRadius: 999, overflow: 'hidden' },
  readThreadFill: { height: 4, borderRadius: 999 },
  threadCount: { fontSize: 10.5, fontWeight: '600' },
});
