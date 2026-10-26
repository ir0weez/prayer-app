// ─── v205 Stories mode ───────────────────────────────────────────────────────
// A mode, not a replacement: a verse (or his grouped run of verses) on one
// screen, his notes on the next, section cards between movements, a
// dedicated screen when a verse carries his Highlight. Tap right to keep
// going, left to go back. Segment bars up top, the grid to jump anywhere,
// and a pace summary at the end — exactly the approved mockup's shape,
// fed by his real groupings and words.

import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import {
  buildStoryScreens,
  flattenEntries,
  type DisplaySection,
  type StoryScreen,
} from '@/lib/bible-v205/index';
import { entryKey, type V205Block, type V205ChapterData } from '@/lib/bible-v205/types';
import { formatReadDate } from '@/lib/bible-v205/study';
import { isKept, resolveTintFields, type MarksMap } from '@/lib/bible-v205/marks';
import {
  partitionBubbleLines,
  quoteBubbleLines,
  resolveBubbleAuthor,
  type BubbleLine,
  type ProfileIdentity,
} from '@/lib/bible-v205/bubbles';
import type { Person } from '@/lib/prayercircle-data';
import { BlockView, CategoryTag, Ornament, SectionBand, SelfLineBlock } from './blocks';
import { AuthorFace, BubbleChatRow, spanLabelFor } from './bubbles';
import { entrySourceCategory } from '@/lib/bible-v205/categories';
import { chapterLabel, rangeLabel, sectionToneFor, tintWashFor, verseTintFor, type BiblePalette } from './palette';

export interface StoriesViewProps {
  book: string;
  display: string;
  chapter: number;
  chapterData: V205ChapterData | null;
  sections: DisplaySection[];
  verses: { verse: number; text: string }[];
  marks: MarksMap;
  palette: BiblePalette;
  /** v214: author resolution for the bubble rows — the People list
   * and his profile identity, same sources as the chapter page. */
  people: Person[];
  profile: ProfileIdentity;
  /** Profile-driven possessives — labels name the signed-in user. */
  possessive: string;
  possessiveLower: string;
  onToggleKept: (start: number, end: number, sourceHasHighlight: boolean) => void;
  /** v259: the app tab bar rides over Stories too — the root pads
   * its foot by this so the Back/Next navbar clears the bar. */
  bottomInset?: number;
  onExit: () => void;
  onNextChapter: (() => void) | null;
  /** v273: the chapter's READ mark, hosted by the chapter page —
   * its own handleMarkRead/handleClearRead behind one toggle, so
   * Stories gains no second mark implementation. readDate is the
   * mark's date (null = unread); onToggleRead is null while the
   * host has no study state loaded, and the end screen's button
   * hides with it. */
  readDate: string | null;
  onToggleRead: (() => void) | null;
}

const screenTypeLabel = (s: StoryScreen): string =>
  s.t === 'cover' ? 'Cover' : s.t === 'section' ? 'Section' : s.t === 'verse' ? 'Verses' : s.t === 'notes' ? 'Notes' : s.t === 'highlight' ? 'Highlight' : 'End';

export function StoriesView(props: StoriesViewProps) {
  // v207: top safe-area inset on the Stories chrome, as the rest of
  // the app applies — Stories replaces the chapter page on screen, so
  // its chrome is the top chrome.
  const insets = useSafeAreaInsets();
  const { palette, book, chapter, sections, verses } = props;
  const screens = useMemo(() => buildStoryScreens(sections), [sections]);
  const [idx, setIdx] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);
  const [overview, setOverview] = useState(false);
  const [screenWidth, setScreenWidth] = useState(360);
  const screen = screens[idx];
  const verseCount = verses.length ? verses[verses.length - 1].verse : 0;
  const verseText = useMemo(() => new Map(verses.map((v) => [v.verse, v.text])), [verses]);

  const flat = useMemo(() => flattenEntries(sections), [sections]);
  const keptTotal = flat.filter((f) =>
    isKept(props.marks, book, chapter, f.entry.start, f.entry.end, f.entry.blocks.some((b) => b.kind === 'highlight')),
  ).length;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(screens.length - 1, next));
    setIdx(clamped);
    setMaxSeen((m) => Math.max(m, clamped));
  };

  const sectionOf = (s: StoryScreen) => {
    if (s.t === 'section') return { start: s.sectionStart, end: s.sectionEnd, title: s.title };
    if (s.t === 'verse' || s.t === 'notes' || s.t === 'highlight') {
      const f = flat.find((x) => x.entry.start === s.entry.start && x.entry.end === s.entry.end);
      return { start: f?.sectionStart ?? s.entry.start, end: f?.sectionEnd ?? s.entry.end, title: f?.sectionTitle ?? null };
    }
    return null;
  };
  const currentSection = sectionOf(screen);
  const sectionIndex = currentSection
    ? sections.findIndex((s) => s.start === currentSection.start) + 1
    : 0;

  const chromeLabel =
    screen.t === 'cover'
      ? `${book} ${chapter} · Stories`
      : screen.t === 'end'
        ? `${book} ${chapter} · Finished`
        : `${currentSection?.title ?? (currentSection ? rangeLabel(currentSection.start, currentSection.end) : '')}`;

  const handleTapZone = (locationX: number, width: number) => {
    if (screen.t === 'cover' || screen.t === 'end') return;
    if (locationX < width / 3) go(idx - 1);
    else go(idx + 1);
  };

  const renderScreen = () => {
    if (screen.t === 'cover') {
      return (
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 24 }}>
          <View style={{ alignItems: 'center', paddingTop: 8 }}>
            <Text style={[styles.kicker, { color: palette.rasp }]}>Personal Study · Stories</Text>
            <Text style={[styles.coverH, { color: palette.ink }]}>Stories</Text>
            <Text style={[styles.coverBook, { color: palette.inkSoft }]}>{book} · {chapterLabel(chapter)}</Text>
            <Ornament palette={palette} />
          </View>
          <Text style={[styles.doorNote, { color: palette.inkSoft }]}>
            A verse, then your notes on it, then the next verse —{' '}
            <Text style={{ fontWeight: '700', color: palette.ink }}>{screens.length} screens</Text>, at your pace. Tap
            right to keep going, left to go back.
          </Text>
          <Pressable style={[styles.beginBtn, { backgroundColor: palette.rasp }, palette.btnDress]} onPress={() => go(1)}>
            <Text style={styles.beginBtnText}>Begin reading</Text>
          </Pressable>
          <View style={[styles.coverSecs, { borderTopColor: palette.line }]}>
            {sections.map((s, i) => (
              <View key={s.start} style={styles.coverSecRow}>
                <Text style={[styles.coverSecNum, { color: palette.rasp }]}>{i + 1}</Text>
                <Text style={[styles.coverSecTitle, { color: palette.ink }]}>{s.title ?? rangeLabel(s.start, s.end)}</Text>
                <View style={[styles.leader, { borderBottomColor: palette.lineDark }]} />
                <Text style={[styles.coverSecRange, { color: palette.inkSoft }]}>{rangeLabel(s.start, s.end)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      );
    }
    if (screen.t === 'section') {
      const count = screens.filter(
        (s) => s.t !== 'section' && s.t !== 'cover' && s.t !== 'end' && sectionOf(s)?.start === screen.sectionStart,
      ).length;
      // v250: the section divider wears the section's tonal card,
      // the same card its verses sit in on the chapter page.
      const tone = sectionToneFor(
        palette,
        Math.max(0, sections.findIndex((s) => s.start === screen.sectionStart)),
      );
      return (
        <View style={[styles.screen, styles.centerScreen]}>
          <Text style={[styles.kicker, { color: palette.rasp, textAlign: 'center' }]}>
            Section {sectionIndex} of {sections.length}
          </Text>
          <View style={[styles.secCardMini, { backgroundColor: tone.bg }]}>
            <SectionBand start={screen.sectionStart} end={screen.sectionEnd} title={screen.title} palette={palette} tone={tone} />
          </View>
          <Text style={[styles.secSub, { color: palette.inkSoft }]}>
            {count} screens in this movement — verses, and notes where they were left.
          </Text>
        </View>
      );
    }
    if (screen.t === 'verse') {
      const e = screen.entry;
      const chars = Array.from({ length: e.end - e.start + 1 }, (_, i) => verseText.get(e.start + i) ?? '').join(' ').length;
      const md = chars > 260;
      const sec = sectionOf(screen);
      const kept = isKept(props.marks, book, chapter, e.start, e.end, e.blocks.some((b) => b.kind === 'highlight'));
      // v212: the entry tint washes the verse screen, and a verse
      // tint highlights that verse's lines — same resolution as the
      // chapter page (split partitions in With-notes, covering
      // grouped records behind Read-only's per-verse entries).
      const tintFields = resolveTintFields(props.marks, book, chapter, e.start, e.end);
      const wash = tintWashFor(palette, tintFields.tint);
      // v250: the verse screen's chip and verse numbers wear their
      // section's tone — the same hue family as the chapter page.
      const secIdx = sec ? sections.findIndex((s) => s.start === sec.start) : -1;
      const tone = sectionToneFor(palette, secIdx >= 0 ? secIdx : 0);
      return (
        <View style={[styles.screen, wash ? { backgroundColor: wash } : null]}>
          <View>
            <View style={[styles.secChip, { backgroundColor: tone.bg }]}>
              <Text style={[styles.secChipText, { color: tone.deep }]}>
                {(sec ? rangeLabel(sec.start, sec.end) : '') + (sec?.title ? ` · ${sec.title}` : '')}
              </Text>
            </View>
            <Text style={[styles.refline, { color: palette.inkFaint }]}>
              {book} {chapter} · {rangeLabel(e.start, e.end)}
            </Text>
          </View>
          <View style={styles.vwrap}>
            {Array.from({ length: e.end - e.start + 1 }, (_, i) => e.start + i).map((v) => {
              const verseBg = verseTintFor(palette, tintFields.verseTints[v]);
              return (
                <Text
                  key={v}
                  style={[styles.vline, { color: palette.ink }, md ? styles.vlineMd : null, verseBg ? { backgroundColor: verseBg } : null]}
                >
                  <Text style={[styles.vn, { color: tone.deep }]}>{v} </Text>
                  {verseText.get(v) ?? ''}
                </Text>
              );
            })}
            {screen.flowNote ? (
              <Text style={[styles.vfoot, { color: palette.inkSoft }]}>
                <Text style={{ color: palette.rasp, fontStyle: 'normal' }}>✦ </Text>
                No notes on this stretch — the verses flow straight on, a little faster.
              </Text>
            ) : null}
          </View>
          <View style={[styles.heartRow, { borderTopColor: palette.line }]}>
            <Pressable
              style={[styles.keepBtn, { borderColor: kept ? palette.rose : palette.lineDark }, palette.btnDress]}
              onPress={() => props.onToggleKept(e.start, e.end, e.blocks.some((b) => b.kind === 'highlight'))}
            >
              <Text style={{ color: kept ? palette.rose : palette.heartOff, fontSize: 15 }}>♥</Text>
              <Text style={{ color: kept ? palette.raspDeep : palette.inkSoft, fontWeight: '700', fontSize: 13.5 }}>
                {kept ? 'Kept' : 'Keep'}
              </Text>
            </Pressable>
            <Text style={[styles.pos, { color: palette.inkFaint }]}>
              {e.start === e.end ? `Verse ${e.start} of ${verseCount}` : `Verses ${e.start}–${e.end} of ${verseCount}`}
            </Text>
          </View>
        </View>
      );
    }
    if (screen.t === 'notes') {
      const e = screen.entry;
      const kept = isKept(props.marks, book, chapter, e.start, e.end, e.blocks.some((b) => b.kind === 'highlight'));
      const sec = sectionOf(screen);
      return (
        <ScrollView style={[styles.screen, { backgroundColor: palette.paper2 }]}>
          <Text style={[styles.kicker, { color: palette.rasp }]}>{props.possessive} Notes</Text>
          <Text style={[styles.notesFor, { color: palette.ink }]}>
            Notes — {rangeLabel(e.start, e.end)}
            {sec?.title ? <Text style={[styles.notesForSoft, { color: palette.inkSoft }]}>  {sec.title}</Text> : null}
          </Text>
          {kept ? (
            <Text style={[styles.keptTag, { color: palette.raspDeep }]}>
              <Text style={{ color: palette.rose }}>♥</Text> This verse is kept
            </Text>
          ) : null}
          {(() => {
            const cat = props.marks[entryKey(book, chapter, e.start, e.end)]?.category ?? entrySourceCategory(e.blocks);
            return cat ? (
              <View style={{ marginTop: 8 }}>
                <CategoryTag category={cat} />
              </View>
            ) : null;
          })()}
          <View style={{ marginTop: 14 }}>
            {e.blocks
              .filter((b) => !(b.kind === 'quote' && b.authorId))
              .map((b, i) => (
                <BlockView key={i} block={b} palette={palette} />
              ))}
            {renderUserBlocks(e.start, e.end)}
            {renderQuoteRows(e.blocks)}
          </View>
        </ScrollView>
      );
    }
    if (screen.t === 'highlight') {
      const e = screen.entry;
      const hl = e.blocks.find((b) => b.kind === 'highlight');
      // v244: authored quotes leave the block flow here too — they
      // ride below as face rows (renderQuoteRows), not ❝ callouts.
      const rest = e.blocks.filter((b) => b !== hl && !(b.kind === 'quote' && b.authorId));
      const kept = isKept(props.marks, book, chapter, e.start, e.end, true);
      const sec = sectionOf(screen);
      return (
        <ScrollView style={[styles.screen, styles.highlightScreen]}>
          <Text style={[styles.kicker, { color: palette.yellowLabel, textAlign: 'center' }]}>✦ A keeper from this verse</Text>
          {hl ? (
            <View style={[styles.bigCallout, { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder }]}>
              <Text style={[styles.calloutLabel, { color: palette.yellowLabel }]}>✦ Highlight</Text>
              <Text style={[styles.bigCalloutText, { color: '#54420A' }]}>{hl.text}</Text>
            </View>
          ) : null}
          <Text style={[styles.hlRef, { color: palette.inkSoft }]}>
            — {props.possessiveLower} line on {rangeLabel(e.start, e.end)}{sec?.title ? ` · ${sec.title}` : ''}
          </Text>
          {rest.map((b, i) => (
            <BlockView key={i} block={b} palette={palette} />
          ))}
          {renderUserBlocks(e.start, e.end)}
          {renderQuoteRows(e.blocks)}
          {kept ? (
            <Text style={[styles.keptTag, { color: palette.raspDeep, textAlign: 'center' }]}>
              <Text style={{ color: palette.rose }}>♥</Text> This verse is kept
            </Text>
          ) : null}
        </ScrollView>
      );
    }
    // end
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.centerScreen, { flexGrow: 1 }]}>
        <Text style={{ color: palette.rasp, fontSize: 13, textAlign: 'center', marginBottom: 10 }}>✦</Text>
        <Text style={[styles.endH, { color: palette.ink }]}>{chapterLabel(chapter)} — finished</Text>
        <Text style={[styles.endSub, { color: palette.inkSoft }]}>
          Verses and notes, screen by screen, all the way through. The pace held — that is the whole idea.
        </Text>
        <View style={[styles.sumbox, { borderTopColor: palette.line }]}>
          <View style={[styles.sumrow, { borderBottomColor: palette.line }]}>
            <Text style={[styles.sumK, { color: palette.inkSoft }]}>Screens read</Text>
            <Text style={[styles.sumV, { color: palette.ink }]}>{maxSeen + 1} of {screens.length}</Text>
          </View>
          <View style={[styles.sumrow, { borderBottomColor: palette.line }]}>
            <Text style={[styles.sumK, { color: palette.inkSoft }]}>Verses covered</Text>
            <Text style={[styles.sumV, { color: palette.ink }]}>{verseCount} of {verseCount}</Text>
          </View>
          <View style={[styles.sumrow, { borderBottomColor: palette.line }]}>
            <Text style={[styles.sumK, { color: palette.inkSoft }]}>Keepers marked</Text>
            <Text style={[styles.sumV, { color: palette.ink }]}>
              <Text style={{ color: palette.rose }}>♥</Text> {keptTotal}
            </Text>
          </View>
        </View>
        <View style={styles.endBtns}>
          {/* v273: the last slide carries Mark as Read (his ask,
              Oct 26 12:11) — the finish line is where the mark
              belongs. Same toggle words as the chapter page's own
              foot: unread offers the button; read shows its date,
              and the tap clears the mark. Rides the host's
              handlers, so noteless and read-only chapters get it
              too — the end screen renders for every chapter. */}
          {props.onToggleRead ? (
            props.readDate === null ? (
              <Pressable
                style={[styles.btnPrimary, { backgroundColor: palette.rasp }, palette.btnDress]}
                onPress={props.onToggleRead}
                accessibilityLabel={`Mark ${book} ${chapter} as read`}
              >
                <Text style={styles.btnPrimaryText}>Mark as Read</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.btnGhost, { borderColor: palette.lineDark }, palette.btnDress]}
                onPress={props.onToggleRead}
                accessibilityLabel={`Clear the read mark for ${book} ${chapter}`}
              >
                <Text style={[styles.btnGhostText, { color: palette.ink }]}>✓ Read · {formatReadDate(props.readDate)}</Text>
              </Pressable>
            )
          ) : null}
          {props.onNextChapter ? (
            <Pressable style={[styles.btnPrimary, { backgroundColor: palette.rasp }, palette.btnDress]} onPress={props.onNextChapter}>
              <Text style={styles.btnPrimaryText}>Next chapter — {book} {chapter + 1} ›</Text>
            </Pressable>
          ) : null}
          <Pressable style={[styles.btnGhost, { borderColor: palette.lineDark }, palette.btnDress]} onPress={props.onExit}>
            <Text style={[styles.btnGhostText, { color: palette.ink }]}>Back to chapter</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  };

  // v214/v217: the author split holds in Stories too. HIS OWN lines
  // read as ordinary in-flow blocks — the same kind styling as the
  // chapter page, no face, no chat row. OTHER PEOPLE's lines read as
  // chat-style bubble rows — avatar + name on the bubble, the kind's
  // tint on its fill, alternating sides among themselves when a
  // screen holds two or more. (No bloom overlay here — Stories
  // paces by taps.)
  const renderUserBlocks = (start: number, end: number) => {
    const m = props.marks[entryKey(book, chapter, start, end)];
    const { selfLines, bubbleLines } = partitionBubbleLines(m);
    if (!selfLines.length && !bubbleLines.length) return null;
    return (
      <>
        {selfLines.map((line, i) => {
          // Self lines are marks lines by construction (v217) —
          // a quote kind can never land in this group.
          if (line.kind === 'quote') return null;
          return (
            <SelfLineBlock
              key={`self-${line.kind}-${line.fieldIndex}-${i}`}
              kind={line.kind}
              text={line.text}
              palette={palette}
              authorName={resolveBubbleAuthor(line.author, props.people, props.profile).name}
              face={
                <AuthorFace
                  author={resolveBubbleAuthor(line.author, props.people, props.profile)}
                  size={34}
                  palette={palette}
                />
              }
              spanText={spanLabelFor(start, end)}
            />
          );
        })}
        {bubbleLines.map((line, i) => (
          <BubbleChatRow
            key={`${line.kind}-${line.fieldIndex}-${i}`}
            line={line}
            author={resolveBubbleAuthor(line.author, props.people, props.profile)}
            palette={palette}
            flip={bubbleLines.length > 1 && i % 2 === 1}
          />
        ))}
      </>
    );
  };

  // v244: a studio quote block carrying a speaker id reads in
  // Stories the way another person's marks line does — a chat row
  // wearing the speaker's face. Name-only quotes never reach here;
  // they stay in the block flow as ❝ callouts.
  const renderQuoteRows = (blocks: V205Block[]) => {
    const quotes = quoteBubbleLines(blocks);
    if (!quotes.length) return null;
    return (
      <>
        {quotes.map((q, i) => {
          const line: BubbleLine = {
            ...q,
            side: quotes.length <= 1 ? 'solo' : i % 2 === 0 ? 'left' : 'right',
          };
          return (
            <BubbleChatRow
              key={`quote-${q.fieldIndex}-${i}`}
              line={line}
              author={resolveBubbleAuthor(line.author, props.people, props.profile)}
              palette={palette}
              flip={quotes.length > 1 && i % 2 === 1}
            />
          );
        })}
      </>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.paper, paddingBottom: props.bottomInset ?? 0 }, palette.screenDress]}>
      <View style={[styles.chrome, { borderBottomColor: palette.line, paddingTop: insets.top + 13 }]}>
        <View style={styles.segs}>
          {screens.map((s, i) => (
            <View
              key={i}
              style={[
                styles.seg,
                { backgroundColor: i <= idx ? palette.rasp : palette.bandLine },
                i === idx ? [styles.segNow, { shadowColor: palette.rasp }] : null,
              ]}
            />
          ))}
        </View>
        <View style={styles.chromebar}>
          <Text style={[styles.secLabel, { color: palette.ink }]} numberOfLines={1}>{chromeLabel}</Text>
          <View style={styles.chromeActions}>
            <Text style={[styles.counter, { color: palette.inkSoft }]}>
              <Text style={{ color: palette.rose }}>♥</Text> {keptTotal} kept
            </Text>
            <Text style={[styles.counter, { color: palette.inkSoft }]}>Screen {idx + 1} / {screens.length}</Text>
            <Pressable onPress={() => setOverview(true)} hitSlop={8}>
              <MaterialIcons name="grid-view" size={19} color={palette.ink} />
            </Pressable>
            <Pressable onPress={props.onExit} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={palette.ink} />
            </Pressable>
          </View>
        </View>
      </View>

      <Pressable
        style={{ flex: 1 }}
        onLayout={(e) => setScreenWidth(e.nativeEvent.layout.width)}
        onPress={(e) => handleTapZone(e.nativeEvent.locationX, screenWidth)}
      >
        <View style={{ flex: 1 }} pointerEvents="box-none">
          {renderScreen()}
        </View>
      </Pressable>

      <View style={[styles.navbar, { borderTopColor: palette.line, backgroundColor: palette.paper }]}>
        <Pressable
          style={[styles.navbtn, idx === 0 ? styles.navbtnOff : null]}
          onPress={() => go(idx - 1)}
          disabled={idx === 0}
        >
          <Text style={[styles.navbtnText, { color: palette.inkSoft }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navhint, { color: palette.inkFaint }]}>Tap right side for next</Text>
        <Pressable
          style={[styles.navbtn, idx >= screens.length - 1 ? styles.navbtnOff : null]}
          onPress={() => go(idx + 1)}
          disabled={idx >= screens.length - 1}
        >
          <Text style={[styles.navbtnText, { color: palette.inkSoft }]}>Next ›</Text>
        </Pressable>
      </View>

      <Modal visible={overview} transparent animationType="slide" onRequestClose={() => setOverview(false)}>
        <Pressable style={styles.scrim} onPress={() => setOverview(false)} />
        <View style={[styles.sheet, { backgroundColor: palette.paper2 }, palette.sheetDress]}>
          <View style={[styles.handle, { backgroundColor: palette.lineDark }]} />
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: palette.ink }]}>
              {book} {chapter}
              <Text style={[styles.sheetSub, { color: palette.inkSoft }]}>  all screens</Text>
            </Text>
            <Pressable onPress={() => setOverview(false)} hitSlop={8}>
              <MaterialIcons name="close" size={20} color={palette.inkSoft} />
            </Pressable>
          </View>
          <View style={styles.legend}>
            <LegendSwatch color={palette.band} border={palette.bandLine} label="Section" palette={palette} />
            <LegendSwatch color={palette.paper} border={palette.lineDark} label="Verses" palette={palette} />
            <LegendSwatch color={palette.greyBg} border={palette.greyBorder} label="Notes" palette={palette} />
            <LegendSwatch color={palette.yellowBg} border={palette.yellowBorder} label="Highlight" palette={palette} />
          </View>
          <ScrollView>
            <View style={styles.ovgrid}>
              {screens.map((s, i) => {
                const label =
                  s.t === 'cover' ? 'Cover'
                    : s.t === 'end' ? 'End'
                      : s.t === 'section' ? (s.title ?? rangeLabel(s.sectionStart, s.sectionEnd))
                        : rangeLabel(s.entry.start, s.entry.end).replace('Ver. ', '');
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.ovcell,
                      palette.frameDress,
                      { borderColor: palette.line, backgroundColor: palette.paper },
                      s.t === 'section' ? { backgroundColor: palette.band, borderColor: palette.bandLine } : null,
                      s.t === 'notes' ? { backgroundColor: palette.greyBg } : null,
                      s.t === 'highlight' ? { backgroundColor: palette.yellowBg, borderColor: palette.yellowBorder } : null,
                      s.t === 'end' ? { backgroundColor: palette.raspTint, borderColor: palette.bandLine } : null,
                      i < idx ? { opacity: 0.62 } : null,
                      i === idx ? { borderColor: palette.rasp, borderWidth: 2 } : null,
                    ]}
                    onPress={() => { go(i); setOverview(false); }}
                  >
                    <Text style={[styles.ovR, { color: palette.ink }]} numberOfLines={1}>{label}</Text>
                    <Text style={[styles.ovT, { color: palette.inkFaint }]}>{screenTypeLabel(s)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ height: 10 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

function LegendSwatch({ color, border, label, palette }: { color: string; border: string; label: string; palette: BiblePalette }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
      <View style={{ width: 13, height: 13, borderRadius: 4, borderWidth: 1, backgroundColor: color, borderColor: border }} />
      <Text style={{ fontSize: 11.5, color: palette.inkSoft }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { paddingHorizontal: 16, paddingTop: 13, paddingBottom: 9, borderBottomWidth: 1 },
  segs: { flexDirection: 'row', gap: 3 },
  seg: { flex: 1, height: 3.5, borderRadius: 2 },
  // v248: the current segment's glow takes the palette accent
  // (inline) — the fixed raspberry shadow died with the fixed palette.
  segNow: { shadowOpacity: 0.35, shadowRadius: 2, shadowOffset: { width: 0, height: 0 } },
  chromebar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  secLabel: { fontSize: 13, fontWeight: '800', flexShrink: 1 },
  chromeActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  counter: { fontSize: 12, fontWeight: '700' },
  screen: { flex: 1, paddingHorizontal: 26, paddingTop: 24, paddingBottom: 18 },
  centerScreen: { justifyContent: 'center' },
  kicker: { fontSize: 10.5, letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: '800' },
  coverH: { fontSize: 40, fontWeight: '800', letterSpacing: -1, marginTop: 10, textAlign: 'center' },
  coverBook: { fontStyle: 'italic', fontSize: 17, marginTop: 8, textAlign: 'center' },
  doorNote: { paddingHorizontal: 6, textAlign: 'center', fontSize: 13.5, lineHeight: 21.5, marginTop: 16 },
  beginBtn: { alignSelf: 'center', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 30, marginTop: 22 },
  beginBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  coverSecs: { marginTop: 24, borderTopWidth: 1, paddingTop: 6 },
  coverSecRow: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingVertical: 7 },
  coverSecNum: { fontWeight: '800', fontSize: 12.5, width: 22 },
  coverSecTitle: { fontWeight: '600', fontSize: 14.5 },
  leader: { flex: 1, borderBottomWidth: 1, borderStyle: 'dotted', minWidth: 14 },
  coverSecRange: { fontSize: 11.5 },
  secSub: { textAlign: 'center', fontSize: 13.5, lineHeight: 21, marginTop: 14, paddingHorizontal: 12 },
  // v250: the section divider's mini card (the chapter page's
  // section card, at divider scale).
  secCardMini: { marginTop: 14, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 18 },
  secChip: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 },
  secChipText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  refline: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, marginTop: 12, textTransform: 'uppercase' },
  vwrap: { flex: 1, justifyContent: 'center', paddingVertical: 10 },
  vline: { fontSize: 20, fontWeight: '700', lineHeight: 32.5, marginBottom: 13 },
  vlineMd: { fontSize: 18.5, lineHeight: 29.5 },
  vn: { fontSize: 12, fontWeight: '800' },
  vfoot: { fontSize: 13, fontStyle: 'italic', lineHeight: 20, marginTop: 8 },
  heartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 15, borderTopWidth: 1, gap: 10 },
  keepBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 15 },
  pos: { fontSize: 12, fontWeight: '600' },
  notesFor: { fontSize: 21, fontWeight: '800', letterSpacing: -0.3, marginTop: 6 },
  notesForSoft: { fontWeight: '600', fontSize: 14 },
  keptTag: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  highlightScreen: { backgroundColor: '#FFFBEB' },
  bigCallout: { borderWidth: 1, borderRadius: 6, paddingVertical: 24, paddingHorizontal: 22, marginTop: 16, marginBottom: 6 },
  calloutLabel: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 6 },
  bigCalloutText: { fontSize: 20.5, lineHeight: 31, fontWeight: '700' },
  hlRef: { textAlign: 'center', fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 8 },
  endH: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  endSub: { fontSize: 14, lineHeight: 22.5, marginTop: 8, paddingHorizontal: 14, textAlign: 'center' },
  sumbox: { marginTop: 22, marginBottom: 6, borderTopWidth: 1 },
  sumrow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 2, borderBottomWidth: 1 },
  sumK: { fontWeight: '600', fontSize: 14.5 },
  sumV: { fontWeight: '800', fontSize: 14.5 },
  endBtns: { gap: 10, marginTop: 20 },
  btnPrimary: { borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  btnGhost: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  btnGhostText: { fontSize: 14.5, fontWeight: '700' },
  navbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 10 },
  navbtn: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999 },
  navbtnOff: { opacity: 0.32 },
  navbtnText: { fontSize: 13.5, fontWeight: '700' },
  navhint: { fontSize: 11, fontWeight: '600' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26,16,20,.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '84%', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 26 },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { fontSize: 16, fontWeight: '800' },
  sheetSub: { fontWeight: '500', fontSize: 12.5 },
  legend: { flexDirection: 'row', gap: 13, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' },
  ovgrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  ovcell: { width: '23%', borderWidth: 1, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 6, minHeight: 46, gap: 1 },
  ovR: { fontSize: 13, fontWeight: '800', lineHeight: 15 },
  ovT: { fontSize: 9, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
});
