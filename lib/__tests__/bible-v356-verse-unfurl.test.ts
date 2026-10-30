// ─── v356: the note box unfurls from the tapped verse ──────────────────────
// His rulings (2026-10-29 22:55 + 23:09, on the Leviticus 26
// screenshots): (1) "I want the text box to unfurl from the verse
// I tap" — since v352 the verse tap homed the composer by its
// '#<verse>' draft preset, but the mark cluster (markbar + type
// chips + YOUR NOTE box) still rendered at the entry body's tail,
// verses away from the tap in a whole-chapter entry. Now the
// cluster has ONE seat at a time: verse-opened, it renders
// directly beneath the tapped verse inside the verse flow and
// grows out of it (VerseUnfurl); (2) the composer's people list
// (117 chips under the box) gains a name search and a Top 5 — the
// five people most often credited on his stored notes
// (rankedAuthorIds over the marks map: the attribution the
// composer itself stores, no invented signal); (3) Android back
// while a composer is open folds the composer through the very
// close Cancel takes, instead of stranding the box until the
// chapter is exited.
// Preserved, and pinned as preserved below: the '#<verse>' preset
// and its #N split/write-back (v352's own tests carry the split),
// save/cancel semantics and span binding, the markbar actions and
// type chips, the bubbles, the verse-number tint tap, the 12dp
// verse separation, and the section model. (v357 later retired
// the no-notes line and the picker's Everyone list — its own
// test file carries those.)

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async () => null,
    setItem: async () => {},
    removeItem: async () => {},
    clear: async () => {},
  },
}));

import { emptyMarks, rankedAuthorIds, type EntryMarks, type MarksMap } from '../bible-v205/marks';

const page = readFileSync(join(process.cwd(), 'components/bible-v205/chapter-page.tsx'), 'utf8');
const bubblesSrc = readFileSync(join(process.cwd(), 'components/bible-v205/bubbles.tsx'), 'utf8');
const entryView = page.slice(page.indexOf('function EntryView'), page.indexOf('const styles = StyleSheet.create'));
const unfurl = page.slice(page.indexOf('function VerseUnfurl'), page.indexOf('function EntryView'));
const picker = bubblesSrc.slice(
  bubblesSrc.indexOf('export function AuthorPicker'),
  bubblesSrc.indexOf('const styles = StyleSheet.create'),
);
const sliceBetween = (src: string, from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to));

describe('v356 — the per-verse seat', () => {
  it('the cluster renders directly beneath the selected verse, inside the verse flow', () => {
    expect(entryView).toContain('composerVerse === v ? (');
    expect(entryView).toContain('<VerseUnfurl closing={composerClosing} onExited={handleUnfurlExited}>');
    expect(entryView).toContain('return [verseBlock, seat];');
    const map = sliceBetween(entryView, 'const verseBlock = (', 'const seat =');
    // v361 amendment: the verse press now rides the words
    // (SelectableText's onPressText) — same destination.
    // v367 amendment (Oct 30): that plain tap is retired. The
    // seat is reached through the selection bar's Note/Bubble
    // actions, and the verse words are explicitly tap-inert.
    expect(map).toContain('tapInert');
    expect(map).not.toContain('onPressText={() => openComposerForVerse(v)}');
    expect(map).toContain('onNote={() => openComposerForVerse(v)}');
    expect(map).toContain("onBubble={() => openComposerForVerse(v, { bubble: true })}");
    // The seat follows the verse block in the map's return pair.
    expect(entryView.indexOf('const verseBlock = (')).toBeLessThan(entryView.indexOf('const seat ='));
    expect(entryView.indexOf('const seat =')).toBeLessThan(entryView.indexOf('return [verseBlock, seat];'));
  });

  it('one cluster, one seat: the body renders it only while no verse holds it', () => {
    expect(entryView).toContain('{composerVerse === null ? renderMarkCluster() : null}');
    // Exactly two render calls: the body seat and the verse seat.
    expect(entryView.split('renderMarkCluster()').length - 1).toBe(2);
    // The cluster itself is one definition carrying the furniture.
    const cluster = sliceBetween(entryView, 'const renderMarkCluster = () => (', '\n  return (');
    // v361 amendment: the cluster is slimmed to his approved model —
    // the Highlight / Main Thought buttons and the category chips
    // are gone from this surface (the composer box still opens as
    // any kind when EDITING a stored line of that kind — the edit
    // paths set it — and saves through the same two calls below).
    expect(cluster).not.toContain("openComposer('highlight')");
    expect(cluster).not.toContain("openComposer('thought')");
    expect(cluster).toContain("openComposer('note')");
    expect(cluster).not.toContain('NOTE_CATEGORIES.map');
    expect(cluster).toContain('styles.composer');
    expect(cluster).toContain('props.onAddLine(composer, text, composerAuthor)');
    expect(cluster).toContain('props.onUpdateLine(editingTarget, { text, author: composerAuthor })');
  });

  it('the seat wrapper shields the box from the head toggle', () => {
    expect(entryView).toContain('onStartShouldSetResponder={() => true}');
    expect(entryView).toContain('key={`verse-composer-${v}`}');
  });
});

describe('v356 — the unfurl', () => {
  it('is timed at 280ms on a gentle ease-out cubic, JS-driven only', () => {
    expect(page).toContain('export const VERSE_COMPOSER_UNFURL_MS = 280;');
    expect(unfurl).toContain('duration: VERSE_COMPOSER_UNFURL_MS');
    expect(unfurl).toContain('easing: RNEasing.out(RNEasing.cubic)');
    expect(unfurl).toContain('useNativeDriver: false');
    expect(unfurl).not.toContain('useNativeDriver: true');
    expect(unfurl).not.toContain('Animated.spring');
  });

  it('grows by measured height + opacity from the top, content riding inside the frame', () => {
    expect(unfurl).toContain('outputRange: [0, naturalH]');
    expect(unfurl).toContain("overflow: 'hidden'");
    expect(unfurl).toContain('opacity: grow');
    expect(unfurl).toContain("position: 'absolute', top: 0, left: 0, right: 0");
    expect(unfurl).toContain('onLayout={(e) => {');
  });

  it('honours reduce-motion with instant open and close', () => {
    expect(unfurl).toContain('AccessibilityInfo.isReduceMotionEnabled()');
    // Instant open: the reduced path settles the growth at 1.
    expect(unfurl).toContain('grow.setValue(1)');
    // Instant close: the reduced path folds to 0 and exits at once.
    expect(unfurl).toContain('grow.setValue(0)');
    expect(unfurl).toContain('onExitedRef.current()');
  });

  it('closing runs the collapse first; the clear is deferred to the exit', () => {
    const close = sliceBetween(entryView, 'const closeComposer = () => {', 'const handleUnfurlExited');
    expect(close).toContain('if (composerVerse !== null)');
    expect(close).toContain('setComposerClosing(true);');
    expect(close).toContain('finishCloseComposer();');
    const exited = sliceBetween(entryView, 'const handleUnfurlExited = () => {', 'const editBubbleLine');
    expect(exited).toContain('if (!closingRef.current) return;');
    expect(exited).toContain('finishCloseComposer();');
  });
});

describe('v356 — retargeting', () => {
  it('tapping another verse reseats the composer and cancels any collapse', () => {
    const fn = sliceBetween(entryView, 'const openComposerForVerse', 'const finishCloseComposer');
    expect(fn).toContain('setComposerVerse(verse);');
    expect(fn).toContain('setComposerClosing(false);');
    expect(fn).toContain('closingRef.current = false;');
    // v352's contract, still intact inside the same function.
    expect(fn).toContain("setComposer('note');");
    expect(fn).toContain('setDraft(`#${verse} `);');
  });

  it('line edits keep the body seat: they clear the verse seat explicitly', () => {
    const bubbleEdit = sliceBetween(entryView, 'const editBubbleLine', 'const editSelfLine');
    const selfEdit = sliceBetween(entryView, 'const editSelfLine', 'const deleteEditingLine');
    expect(bubbleEdit).toContain('setComposerVerse(null);');
    expect(selfEdit).toContain('setComposerVerse(null);');
  });
});

describe('v356 — the verse-open scroll', () => {
  it('the entry reports the tapped verse top from its onLayout cache', () => {
    expect(entryView).toContain('props.onVerseSeatOpen?.(versesBoxYRef.current + (verseYRef.current.get(verse) ?? 0));');
    expect(entryView).toContain('onLayout={(e) => verseYRef.current.set(v, e.nativeEvent.layout.y)}');
    expect(entryView).toContain('versesBoxYRef.current = e.nativeEvent.layout.y;');
  });

  it('the page lands the verse only when verse + box would not already fit', () => {
    expect(page).toContain('export const VERSE_COMPOSER_ROOM_PX = 360;');
    const handler = sliceBetween(page, 'onVerseSeatOpen={(yWithinEntry) => {', '}}\n              />');
    expect(handler).toContain('const verseTop = entryY + yWithinEntry;');
    expect(handler).toContain('screenTop < headerHRef.current + CHAPTER_HEADER_LAND_GAP');
    expect(handler).toContain('screenTop > vh - VERSE_COMPOSER_ROOM_PX');
    expect(handler).toContain('scrollToY(verseTop);');
  });
});

describe('v356 — preservation', () => {
  it('the bubbles layer is untouched (the no-notes line was retired by v357)', () => {
    expect(entryView).toContain('<LivingBubbles');
    expect(entryView).toContain('onEditLine={editBubbleLine}');
  });

  it('the head keeps its toggle; the verse number is a plain token now (v361)', () => {
    // v361 amendment: the number's tint-selection tap is retired
    // with the v212 selection model — selection is the drag.
    expect(entryView).not.toContain('onToggleVerse');
    expect(entryView).toContain('onPress={props.onToggleOpen}');
  });
});

describe('v356 — the Top 5 derivation (rankedAuthorIds)', () => {
  const entry = (partial: Partial<EntryMarks>): EntryMarks => ({ ...emptyMarks(), ...partial });

  it('ranks by stored attribution count across all entries and line kinds', () => {
    const marks: MarksMap = {
      'Genesis|1|1-3': entry({
        notes: [
          { text: 'a', authorId: 'p-eva', authorName: 'Eva' },
          { text: 'b', authorId: 'p-eva', authorName: 'Eva' },
          'his own words carry no author',
        ],
      }),
      'Genesis|1|4-6': entry({
        highlights: [{ text: 'c', authorId: 'p-cody', authorName: 'Cody' }],
        thoughts: [{ text: 'd', authorId: 'p-eva', authorName: 'Eva' }],
      }),
      'Exodus|2|1-2': entry({
        notes: [
          { text: 'e', authorId: 'p-cody', authorName: 'Cody' },
          { text: 'f', authorId: 'p-anna', authorName: 'Anna' },
        ],
      }),
    };
    expect(rankedAuthorIds(marks)).toEqual(['p-eva', 'p-cody', 'p-anna']);
  });

  it('breaks ties by credited name, caps at the limit, and reads empty as empty', () => {
    const marks: MarksMap = {
      'Genesis|1|1-1': entry({
        notes: [
          { text: '1', authorId: 'p-zed', authorName: 'Zed' },
          { text: '2', authorId: 'p-amy', authorName: 'Amy' },
          { text: '3', authorId: 'p-max', authorName: 'Max' },
          { text: '4', authorId: 'p-max', authorName: 'Max' },
        ],
      }),
    };
    // Max leads on count; Amy before Zed on the name tie-break.
    expect(rankedAuthorIds(marks)).toEqual(['p-max', 'p-amy', 'p-zed']);
    expect(rankedAuthorIds(marks, 2)).toEqual(['p-max', 'p-amy']);
    expect(rankedAuthorIds({})).toEqual([]);
    expect(rankedAuthorIds({ 'Genesis|1|1-1': entry({ notes: ['plain'] }) })).toEqual([]);
  });

  it('the page ranks from the whole marks map and threads the ids to the picker', () => {
    expect(page).toContain('const topAuthorIds = useMemo(() => rankedAuthorIds(marks), [marks]);');
    expect(page).toContain('topAuthorIds={topAuthorIds}');
    expect(entryView).toContain('topPeopleIds={props.topAuthorIds}');
  });
});

describe('v356 — people search + Top 5 in the composer', () => {
  it('a search field at the top of the list filters people by name as he types', () => {
    expect(picker).toContain('placeholder="Search people…"');
    expect(picker).toContain('onChangeText={setQuery}');
    expect(picker).toContain('people.filter((person) => person.name.toLowerCase().includes(q))');
    expect(picker).toContain('{matches.map(personChip)}');
  });

  it('at rest the Top 5 leads (v357 removed the Everyone list below it)', () => {
    expect(picker).toContain('>Top 5</Text>');
    expect(picker).toContain('.slice(0, 5)');
    // Ranked ids resolve against the live roster; the departed
    // simply do not render.
    expect(picker).toContain('.map((id) => people.find((person) => person.id === id))');
  });

  it('selection behaviour is unchanged: a tap stores the author, Me clears it', () => {
    expect(picker).toContain('onChange({ authorId: person.id, authorName: person.name })');
    expect(picker).toContain('onPress={() => onChange(null)}');
    expect(picker).toContain('value?.authorId === person.id');
  });
});

describe('v356 — back closes the composer', () => {
  it('the handler is registered only while a composer is open', () => {
    expect(entryView).toContain('const composerOpen = composer !== null;');
    const effect = sliceBetween(entryView, 'const composerOpen = composer !== null;', 'const editBubbleLine');
    expect(effect).toContain('if (!composerOpen) return;');
    expect(effect).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(effect).toContain('[composerOpen]');
  });

  it('back takes the Cancel close path itself', () => {
    expect(entryView).toContain('composerCloseRef.current = closeComposer;');
    const effect = sliceBetween(entryView, 'const composerOpen = composer !== null;', 'const editBubbleLine');
    expect(effect).toContain('composerCloseRef.current();');
    expect(effect).toContain('return true;');
    // Cancel's own button still calls the same close.
    const cluster = sliceBetween(entryView, 'const renderMarkCluster = () => (', '\n  return (');
    expect(cluster).toContain('<Pressable onPress={closeComposer}>');
  });
});
