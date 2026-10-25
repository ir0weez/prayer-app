// ─── v205 shared rendering: his blocks, bands, callouts, status chips ───────
// v250 "The Bible, Material": the section band is now the head of a
// big tonal section CARD (the card itself is laid out by the chapter
// page / Stories), wearing the section's own derived hue; and his
// own plain Note line is the mockup's filled seed card — face, name,
// NOTE tag, span — the most colorful object on the page. The meaning
// surfaces (Highlight gold, Main Thought grey, the category code)
// keep their dress exactly.

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NoteCategory, StudyStatus, V205Block } from '@/lib/bible-v205/types';
import { CATEGORY_META } from '@/lib/bible-v205/categories';
import { rangeLabel, useBiblePalette, type BiblePalette, type BibleSectionTone } from './palette';

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

/**
 * v250: the section card's head — the mockup's sechead, verbatim in
 * shape: the section hue's dot, the range in strong ink, the title
 * beside it, and the quiet chevron the mockup draws at the right.
 * The tonal card around it is laid out by the caller (the chapter
 * page's section wrap, the Stories section screen), in the tone
 * passed here.
 */
export function SectionBand({
  start,
  end,
  title,
  palette,
  tone,
}: {
  start: number;
  end: number;
  title: string | null;
  palette: BiblePalette;
  tone: BibleSectionTone;
}) {
  return (
    <View style={styles.secHead}>
      <View style={[styles.secDot, { backgroundColor: tone.hue }]} />
      <Text style={[styles.secRange, { color: palette.ink }]}>{rangeLabel(start, end)}</Text>
      {title ? (
        <Text style={[styles.secTitle, { color: palette.ink }]} numberOfLines={1}>
          {title}
        </Text>
      ) : null}
      <MaterialIcons name="expand-more" size={18} color={palette.inkFaint} style={styles.secChev} />
    </View>
  );
}

/** One content block of an entry: paragraph, cross-reference, or a keeper callout. */
export function BlockView({
  block,
  palette,
  big,
}: {
  block: V205Block;
  palette: BiblePalette;
  big?: boolean;
}) {
  if (block.kind === 'para' || block.kind === 'conversation') {
    return (
      <Text
        style={[
          styles.para,
          { color: palette.ink },
          block.kind === 'conversation' ? { fontStyle: 'italic' } : null,
        ]}
      >
        {block.kind === 'conversation' ? <Text style={{ fontStyle: 'normal', fontWeight: '700' }}>Conversation — </Text> : null}
        {block.text}
      </Text>
    );
  }
  if (block.kind === 'note') {
    // v210: his plain personal note — inset body text like a commentary
    // paragraph, with NO box: no background, no border, no label.
    return <Text style={[styles.para, styles.notePara, { color: palette.ink }]}>{block.text}</Text>;
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
  // v223: a quote is someone else's words, shown WITH the author's name —
  // never rendered as a plain note, never dropped. v245 (his ruling,
  // 2026-10-25: "Quote should be red"): the callout wears the quote
  // category's red family, like every other Quote surface — it sat in
  // the grey family until now.
  if (block.kind === 'quote') {
    const quoteMeta = CATEGORY_META.quote;
    return (
      <View style={[styles.callout, { backgroundColor: quoteMeta.bg, borderColor: quoteMeta.color }]}>
        <Text style={[styles.calloutLabel, { color: quoteMeta.ink }]}>❝ Quote — {block.authorName || 'Someone'}</Text>
        <Text style={[styles.calloutText, { color: palette.greyInk }]}>{block.text}</Text>
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

/**
 * v217: one of HIS OWN marks lines, rendered in the text flow (the
 * author split: his words live in the text; other people's words are
 * bubbles). Kind styling: a Main Thought keeps the pre-v214 grey
 * callout (a meaning dress) and the Highlight wears the approved
 * in-flow mockup's block: pale yellow, radius 10, no border, the
 * small ✦ HIGHLIGHT label over 15.5px words. v250: a plain Note —
 * when the caller supplies its author's face — wears the Material
 * makeover's filled seed card (below); without one it falls back
 * to the v210 bare inset text. (This dresses his MARKS lines only;
 * imported commentary note BLOCKS keep the v210 bare-text ruling
 * in BlockView.)
 */
export function SelfLineBlock({
  kind,
  text,
  palette,
  authorName,
  face,
  spanText,
}: {
  kind: 'note' | 'highlight' | 'thought';
  text: string;
  palette: BiblePalette;
  /** v250: the author's name for the filled card's head. The face
   * itself arrives as a rendered node — this module stays out of
   * the bubbles component tree (its reanimated import is not every
   * surface's to carry); both callers already render AuthorFace. */
  authorName?: string;
  face?: ReactNode;
  /** v250: "on v. 11" — the span the line rides on, as drawn. */
  spanText?: string;
}) {
  if (kind === 'highlight') {
    return (
      <View style={[styles.selfHighlight, { backgroundColor: palette.yellowBg }]}>
        <Text style={[styles.selfHighlightLabel, { color: palette.yellowLabel }]}>✦ Highlight</Text>
        <Text style={[styles.selfHighlightText, { color: palette.yellowInk }]}>{text}</Text>
      </View>
    );
  }
  if (kind === 'note' && face) {
    // v250: his own Note is the mockup's filled card — the seed
    // itself, his face ringed in white, his name, the NOTE tag in
    // pale seed tonal, the span in the card's softer ink. The most
    // colorful object on the page, in every palette he picks.
    return (
      <View style={[styles.selfNote, { backgroundColor: palette.noteFill }, palette.noteDress]}>
        <View style={styles.selfNoteHead}>
          <View style={styles.selfNoteFaceRing}>{face}</View>
          <Text style={[styles.selfNoteName, { color: palette.noteInk }]} numberOfLines={1}>
            {authorName ?? ''}
          </Text>
          <View style={[styles.selfNoteTag, { backgroundColor: palette.noteTagBg }]}>
            <Text style={[styles.selfNoteTagText, { color: palette.noteTagInk }]}>NOTE</Text>
          </View>
          {spanText ? (
            <Text style={[styles.selfNoteSpan, { color: palette.noteInkSoft }]}>{spanText}</Text>
          ) : null}
        </View>
        <Text style={[styles.selfNoteText, { color: palette.noteInk }]}>{text}</Text>
      </View>
    );
  }
  return <BlockView block={{ kind, text }} palette={palette} />;
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

/** v233: the READ headline chip — a noteless chapter's finished
 * state ("Read means Read"). Dressed exactly like the Complete chip:
 * on a noteless chapter, Read IS the finished mark. */
export function ReadChip({ palette }: { palette: BiblePalette }) {
  return (
    <View style={[styles.chip, { backgroundColor: palette.rasp, borderColor: palette.rasp }]}>
      <Text style={[styles.chipText, { color: '#FFFFFF' }]}>✓ Read</Text>
    </View>
  );
}

export function StatusChip({ status, palette }: { status: StudyStatus; palette: BiblePalette }) {
  const style =
    status === 'complete'
      ? { backgroundColor: palette.rasp, borderColor: palette.rasp, color: '#FFFFFF' }
      : status === 'in-progress'
        ? { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder, color: palette.yellowInk }
        : status === 'write'
          ? { backgroundColor: palette.paper, borderColor: palette.rasp, color: palette.raspDeep }
          : status === 'restudy'
            ? { backgroundColor: palette.band, borderColor: palette.bandBorder, color: palette.bandInk }
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
  // v250 section-card head (the mockup's sechead): hue dot, strong
  // range, title, quiet chevron — the card around it carries the tone.
  secHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 },
  secDot: { width: 11, height: 11, borderRadius: 6 },
  secRange: { fontWeight: '800', fontSize: 15 },
  secTitle: { fontWeight: '700', fontSize: 15, flexShrink: 1 },
  secChev: { marginLeft: 'auto', opacity: 0.45 },
  // v250 filled self-note card (the mockup's notecard numbers).
  selfNote: { borderRadius: 24, paddingVertical: 14, paddingHorizontal: 16, marginTop: 12, marginBottom: 14 },
  selfNoteHead: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  selfNoteFaceRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selfNoteName: { fontSize: 13.5, fontWeight: '700', flexShrink: 1 },
  selfNoteTag: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8 },
  selfNoteTagText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  selfNoteSpan: { fontSize: 13, fontWeight: '600' },
  selfNoteText: { fontSize: 15, lineHeight: 22.5, marginTop: 9 },
  para: { fontSize: 15, lineHeight: 25.5, marginBottom: 12, paddingHorizontal: 5, marginLeft: -5 },
  notePara: { marginLeft: 8 },
  callout: { borderRadius: 6, paddingVertical: 15, paddingHorizontal: 17, marginVertical: 14, borderWidth: 1 },
  scripture: { borderLeftWidth: 3, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  scriptureQuote: { fontStyle: 'italic', fontSize: 14, lineHeight: 23 },
  scriptureRef: { fontWeight: '800', fontSize: 13.5, marginTop: 7 },
  calloutLabel: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
  calloutText: { fontSize: 14.5, lineHeight: 23, fontWeight: '600' },
  calloutTextBig: { fontSize: 20.5, lineHeight: 31, fontWeight: '700' },
  // v217 in-flow Highlight (approved mockup numbers): pale-yellow
  // inset, radius 10, NO border, label over the words.
  selfHighlight: { borderRadius: 10, paddingTop: 11, paddingHorizontal: 13, paddingBottom: 12, marginTop: 12, marginBottom: 12 },
  selfHighlightLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 5 },
  selfHighlightText: { fontSize: 15.5, lineHeight: 23, fontWeight: '600' },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9, alignSelf: 'flex-start' },
  chipText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
  catTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9, alignSelf: 'flex-start' },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTagText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.7, textTransform: 'uppercase' },
});
