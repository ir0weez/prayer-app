// ─── v205 shared rendering: his blocks, bands, callouts, status chips ───────

import { StyleSheet, Text, View } from 'react-native';
import type { NoteCategory, StudyStatus, V205Block } from '@/lib/bible-v205/types';
import { CATEGORY_META } from '@/lib/bible-v205/categories';
import { rangeLabel, useBiblePalette, type BiblePalette } from './palette';

/**
 * His color code made visible: a small labeled tag in the category's
 * own color — a colored note in his pages is a KIND of note (a
 * definition, a quote, a good thought to speak on…), not decoration.
 */
export function CategoryTag({ category, phrase }: { category: NoteCategory; phrase?: boolean }) {
  const meta = CATEGORY_META[category];
  return (
    <View style={[styles.catTag, { backgroundColor: meta.bg, borderColor: meta.color }]}>
      <View style={[styles.catDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.catTagText, { color: meta.ink }]}>{phrase ? meta.phrase : meta.label}</Text>
    </View>
  );
}

export function Ornament({ palette }: { palette: BiblePalette }) {
  return (
    <View style={styles.orn}>
      <View style={[styles.ornLine, { backgroundColor: palette.band }]} />
      <Text style={[styles.ornDia, { color: palette.rasp }]}>✦</Text>
      <View style={[styles.ornLine, { backgroundColor: palette.band }]} />
    </View>
  );
}

export function SectionBand({
  start,
  end,
  title,
  palette,
}: {
  start: number;
  end: number;
  title: string | null;
  palette: BiblePalette;
}) {
  return (
    <View style={[styles.band, { backgroundColor: palette.band }]}>
      <Text style={[styles.bandRange, { color: palette.bandInk }]}>{rangeLabel(start, end)}</Text>
      {title ? (
        <>
          <Text style={styles.bandDot}>·</Text>
          <Text style={[styles.bandTitle, { color: palette.ink }]}>{title}</Text>
        </>
      ) : null}
    </View>
  );
}

/** One content block of an entry: paragraph, cross-reference, or a keeper callout. */
export function BlockView({
  block,
  palette,
  tinted,
  big,
}: {
  block: V205Block;
  palette: BiblePalette;
  tinted?: string | null;
  big?: boolean;
}) {
  if (block.kind === 'para' || block.kind === 'conversation') {
    return (
      <Text
        style={[
          styles.para,
          { color: palette.ink },
          tinted ? { backgroundColor: tinted, borderRadius: 6 } : null,
          block.kind === 'conversation' ? { fontStyle: 'italic' } : null,
        ]}
      >
        {block.kind === 'conversation' ? <Text style={{ fontStyle: 'normal', fontWeight: '700' }}>Conversation — </Text> : null}
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'scripture') {
    return (
      <View
        style={[
          styles.callout,
          styles.scripture,
          { backgroundColor: palette.calloutPaper, borderColor: palette.greyBorder, borderLeftColor: palette.rasp },
        ]}
      >
        <Text style={[styles.scriptureQuote, { color: palette.greyInk }]}>“{block.text}”</Text>
        {block.ref ? <Text style={[styles.scriptureRef, { color: palette.ink }]}>{block.ref}</Text> : null}
      </View>
    );
  }
  if (block.kind === 'highlight') {
    return (
      <View style={[styles.callout, { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder }]}>
        <Text style={[styles.calloutLabel, { color: palette.yellowLabel }]}>✦ Highlight</Text>
        <Text style={[styles.calloutText, { color: '#54420A' }, big ? styles.calloutTextBig : null]}>{block.text}</Text>
      </View>
    );
  }
  // thought
  return (
    <View style={[styles.callout, { backgroundColor: palette.greyBg, borderColor: palette.greyBorder }]}>
      <Text style={[styles.calloutLabel, { color: palette.greyLabel }]}>Main Thought</Text>
      <Text style={[styles.calloutText, { color: palette.greyInk }]}>{block.text}</Text>
    </View>
  );
}

// ─── Study status chips (his Notion words, the study-system mockup) ─────────

export const STATUS_LABEL: Record<StudyStatus, string> = {
  complete: '✓ Complete',
  'in-progress': 'In progress',
  write: 'Write',
  restudy: '↻ ReStudy',
  'not-started': 'Not started',
  none: 'None',
};

export function StatusChip({ status, palette }: { status: StudyStatus; palette: BiblePalette }) {
  const style =
    status === 'complete'
      ? { backgroundColor: palette.rasp, borderColor: palette.rasp, color: '#FFFFFF' }
      : status === 'in-progress'
        ? { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder, color: palette.yellowInk }
        : status === 'write'
          ? { backgroundColor: palette.paper, borderColor: palette.rasp, color: palette.raspDeep }
          : status === 'restudy'
            ? { backgroundColor: palette.band, borderColor: '#EFC3D6', color: palette.bandInk }
            : { backgroundColor: palette.greyBg, borderColor: palette.greyBorder, color: palette.greyLabel };
  return (
    <View style={[styles.chip, { backgroundColor: style.backgroundColor, borderColor: style.borderColor }]}>
      <Text style={[styles.chipText, { color: style.color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  orn: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 18, maxWidth: 210, alignSelf: 'center', width: '100%' },
  ornLine: { flex: 1, height: 2, borderRadius: 1 },
  ornDia: { fontSize: 11 },
  band: { flexDirection: 'row', alignItems: 'baseline', gap: 8, borderRadius: 6, paddingVertical: 11, paddingHorizontal: 15 },
  bandRange: { fontWeight: '800', fontSize: 14.5 },
  bandDot: { color: '#DE8FB4', fontWeight: '700' },
  bandTitle: { fontWeight: '700', fontSize: 16.5, flexShrink: 1 },
  para: { fontSize: 15, lineHeight: 25.5, marginBottom: 12, paddingHorizontal: 5, marginLeft: -5 },
  callout: { borderRadius: 6, paddingVertical: 15, paddingHorizontal: 17, marginVertical: 14, borderWidth: 1 },
  scripture: { borderLeftWidth: 3, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  scriptureQuote: { fontStyle: 'italic', fontSize: 14, lineHeight: 23 },
  scriptureRef: { fontWeight: '800', fontSize: 13.5, marginTop: 7 },
  calloutLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
  calloutText: { fontSize: 14.5, lineHeight: 23, fontWeight: '600' },
  calloutTextBig: { fontSize: 20.5, lineHeight: 31, fontWeight: '700' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, alignSelf: 'flex-start' },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTagText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
});
