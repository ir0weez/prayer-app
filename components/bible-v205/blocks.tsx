// ─── v205 shared rendering: his blocks, bands, callouts, status chips ───────
// v250 "The Bible, Material": the section band is now the head of a
// big tonal section CARD (the card itself is laid out by the chapter
// page / Stories), wearing the section's own derived hue. The meaning
// surfaces (Highlight gold, the category code) keep their dress.
//
// v311 "The Bible, to the Drawing" (approved Oct 28, 12:42 — his
// Notion layout, ruled 11:52 the same day): his note is NO LONGER the
// v250 filled seed card. Main note text flows as bare text at the
// full verse-column width; the four typed kinds — Highlight,
// Definition, Quote, Personal Story — sit BETWEEN stretches of that
// text in their family-coloured boxes with a small kind tag; Main
// Thought flows as plain text too (it was never in his boxed list).
// The v250 filled-card dress survives only in the palette derivation
// (the Stories cover field wears noteFill now).

import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { NoteCategory, StudyStatus, V205Block } from '@/lib/bible-v205/types';
import { CATEGORY_META, blockCategory, type CategoryMeta } from '@/lib/bible-v205/categories';
import type { PhraseHighlight, TintColor } from '@/lib/bible-v205/marks';
import { rangeLabel, useBiblePalette, type BiblePalette, type BibleSectionTone } from './palette';
import { SelectableText } from './selectable-text';

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

/**
 * v311: one of the four typed kinds in its family box — the drawing's
 * nbox: radius 12, no border, the family ground, a small uppercase
 * kind tag in the family's ink, the words in plain ink. (Highlight's
 * ground is the palette's keeper yellow — the same #FFF3BF the
 * category code itself names for good-thought.)
 */
function CategoryBox({
  meta,
  tag,
  text,
  palette,
  big,
}: {
  meta: CategoryMeta;
  tag: string;
  text: string;
  palette: BiblePalette;
  big?: boolean;
}) {
  const bg = meta.id === 'good-thought' ? palette.yellowBg : meta.bg;
  return (
    <View style={[styles.nbox, { backgroundColor: bg }]}>
      <Text style={[styles.ktag, { color: meta.ink }]}>{tag}</Text>
      <Text style={[styles.nboxText, { color: palette.ink }, big ? styles.nboxTextBig : null]}>{text}</Text>
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
  if (block.kind === 'para' || block.kind === 'conversation' || block.kind === 'note') {
    // v311: a block carrying one of his four categories (a Studio
    // Definition / Personal Story / Quote / Good-thought box arrives
    // as a categorized paragraph) sits in its family box; everything
    // else flows as bare text — the note kind included (v210's
    // no-box ruling, now the whole flow's rule).
    const cat = blockCategory(block);
    if (cat) {
      const meta = CATEGORY_META[cat];
      return <CategoryBox meta={meta} tag={meta.label} text={block.text} palette={palette} big={big} />;
    }
    return (
      <Text
        style={[
          styles.para,
          { color: palette.ink },
          block.kind === 'note' ? styles.notePara : null,
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
    // v311: the Highlight wears the drawing's yellow box (his yellow
    // class by construction — blockCategory reads it as good-thought).
    return (
      <CategoryBox meta={CATEGORY_META['good-thought']} tag="Highlight" text={block.text} palette={palette} big={big} />
    );
  }
  // v223: a quote is someone else's words, shown WITH the author's name —
  // never rendered as a plain note, never dropped. v245 (his ruling,
  // 2026-10-25: "Quote should be red"): the red family. v311: the
  // drawing's red box, the author riding the tag line.
  if (block.kind === 'quote') {
    const quoteMeta = CATEGORY_META.quote;
    return (
      <CategoryBox
        meta={quoteMeta}
        tag={block.authorName ? `Quote — ${block.authorName}` : 'Quote'}
        text={block.text}
        palette={palette}
        big={big}
      />
    );
  }
  // thought — v311: a Main Thought flows as plain text in the note
  // flow (his Oct 28 ruling: it was not in the boxed list). The grey
  // callout is retired.
  return <Text style={[styles.para, { color: palette.ink }]}>{block.text}</Text>;
}

/**
 * v217: one of HIS OWN marks lines, rendered in the text flow (the
 * author split: his words live in the text; other people's words are
 * bubbles). v311 (his Notion layout, ruled Oct 28): a Note — and a
 * Main Thought, which flows as text too — renders UNBOXED: a small
 * attribution head (face + name + "on v. N", no badge chips) over
 * bare text at the full column width. A Highlight keeps its yellow
 * box (the drawing's bubble-highlight: the head rides inside the
 * box). Without a face, lines fall back to BlockView's dresses.
 */
export function SelfLineBlock({
  kind,
  text,
  palette,
  authorName,
  face,
  spanText,
  selection,
  onPressText,
}: {
  kind: 'note' | 'highlight' | 'thought';
  text: string;
  palette: BiblePalette;
  /** v250: the author's name for the flow head. The face itself
   * arrives as a rendered node — this module stays out of the
   * bubbles component tree (its reanimated import is not every
   * surface's to carry); both callers already render AuthorFace. */
  authorName?: string;
  face?: ReactNode;
  /** "on v. 11" — the span the line rides on, as drawn. */
  spanText?: string;
  /**
   * v361: drag-selection inside the line's own words (the chapter
   * page supplies it for his faced lines; Stories leaves it off and
   * renders exactly as before). The tint action carries the range;
   * Bubble and Note act on the line's parent VERSE — his ruling:
   * bubbles are a verse-level thing, full stop — so they take none.
   */
  selection?: {
    highlights: readonly PhraseHighlight[];
    onApplyTint: (range: { start: number; end: number }, tint: TintColor) => void;
    onBubble: () => void;
    onNote: () => void;
    onDragChange?: (active: boolean) => void;
  };
  /** v361: a plain tap on the words when selection renders them
   * (the caller's edit affordance, previously the wrapping
   * Pressable's job). */
  onPressText?: () => void;
}) {
  if (kind === 'highlight') {
    // v311: the drawing's bubble-highlight — the yellow box with the
    // attribution head inside it; without a face, the kind tag alone.
    return (
      <View style={[styles.nbox, { backgroundColor: palette.yellowBg }]}>
        {face ? (
          <View style={styles.flowHead}>
            {face}
            <Text style={[styles.flowName, { color: palette.ink }]} numberOfLines={1}>
              {authorName ?? ''}
            </Text>
            {spanText ? <Text style={[styles.flowSpan, { color: palette.yellowInk }]}>{spanText}</Text> : null}
          </View>
        ) : (
          <Text style={[styles.ktag, { color: CATEGORY_META['good-thought'].ink }]}>Highlight</Text>
        )}
        {selection ? (
          <SelectableText
            text={text}
            palette={palette}
            textStyle={[styles.nboxText, { color: palette.ink }]}
            highlights={selection.highlights}
            onPressText={onPressText}
            onApplyTint={selection.onApplyTint}
            onBubble={selection.onBubble}
            onNote={selection.onNote}
            onDragChange={selection.onDragChange}
          />
        ) : (
          <Text style={[styles.nboxText, { color: palette.ink }]}>{text}</Text>
        )}
      </View>
    );
  }
  if (face) {
    // v311: the unboxed note flow — attribution head, then the words
    // as bare text. No card, no background, no tag chip (the v250
    // filled seed card is retired by his Oct 28 ruling).
    // v361: when the caller hands over selection, the words render
    // through SelectableText — same bare dress, now drag-selectable,
    // his phrase highlights washing the words they were made on.
    return (
      <View style={styles.flowWrap}>
        <View style={styles.flowHead}>
          {face}
          <Text style={[styles.flowName, { color: palette.ink }]} numberOfLines={1}>
            {authorName ?? ''}
          </Text>
          {spanText ? <Text style={[styles.flowSpan, { color: palette.inkSoft }]}>{spanText}</Text> : null}
        </View>
        {selection ? (
          <SelectableText
            text={text}
            palette={palette}
            textStyle={[styles.flowText, { color: palette.ink }]}
            highlights={selection.highlights}
            onPressText={onPressText}
            onApplyTint={selection.onApplyTint}
            onBubble={selection.onBubble}
            onNote={selection.onNote}
            onDragChange={selection.onDragChange}
          />
        ) : (
          <Text style={[styles.flowText, { color: palette.ink }]}>{text}</Text>
        )}
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
  // v311: the chip families match the drawing's two-channel system —
  // in-progress wears the tonal seed container (it was keeper
  // yellow), ReStudy the teal family, Write the outlined card.
  const style =
    status === 'complete'
      ? { backgroundColor: palette.rasp, borderColor: palette.rasp, color: '#FFFFFF' }
      : status === 'in-progress'
        ? { backgroundColor: palette.progBg, borderColor: palette.progBg, color: palette.progInk }
        : status === 'write'
          ? { backgroundColor: palette.paper2, borderColor: palette.bandBorder, color: palette.raspDeep }
          : status === 'restudy'
            ? { backgroundColor: palette.accentTeal.bg, borderColor: palette.accentTeal.bg, color: palette.accentTeal.deep }
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
  secDot: { width: 9, height: 9, borderRadius: 5 },
  secRange: { fontWeight: '800', fontSize: 15 },
  secTitle: { fontWeight: '700', fontSize: 15, flexShrink: 1 },
  secChev: { marginLeft: 'auto', opacity: 0.45 },
  // v311 typed-kind box (the drawing's nbox): radius 12, no border,
  // family ground, small uppercase kind tag over the words.
  nbox: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 15, marginTop: 12, marginBottom: 12 },
  ktag: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 },
  nboxText: { fontSize: 15, lineHeight: 23.5 },
  nboxTextBig: { fontSize: 20.5, lineHeight: 31, fontWeight: '700' },
  // v311 unboxed note flow: attribution head over bare text.
  flowWrap: { marginTop: 14, marginBottom: 12 },
  flowHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  flowName: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  flowSpan: { fontSize: 12.5, fontWeight: '500' },
  flowText: { fontSize: 15.5, lineHeight: 24 },
  para: { fontSize: 15, lineHeight: 25.5, marginBottom: 12, paddingHorizontal: 5, marginLeft: -5 },
  // v313: his Notion rule in its final form — the note's main text
  // sits at the SAME width as the verses it belongs to; the old 8px
  // inset (a v5-era narrowing he ruled against) is gone.
  notePara: {},
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
