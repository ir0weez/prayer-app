// ─── v205 chapter route ──────────────────────────────────────────────────────
// Thin shell over the polished chapter page; all of the surface lives in
// components/bible-v205/chapter-page.tsx.
//
// v243: the shell now wears BibleScreenBoundary like its three sibling
// screens. The reader was the only Bible surface that could still fail
// silently — the Oct 25 blank-Bible diagnosis showed a malformed
// imports record throwing inside the page's computations with nothing
// between the throw and the navigator's blank card. The boundary turns
// any such failure into the visible fallback page instead.
//
// v265: the shell's Study pane renders this same component with
// `pane` props (book/chapter/stories + navigation callbacks) — the
// reader itself is unchanged either way. Route mode (a deep link's
// landing) keeps the router, its tab bar, and its own insets; pane
// mode leaves the bar to the shell and the insets to the shell's
// ScreenContainer, and walks the pane stack.

import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChapterPageView } from '@/components/bible-v205/chapter-page';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';
import { BibleTabBar, useTabBarOccupiedHeight } from '@/components/app-tab-bar';
import { bibleShellParamsForRoute, type BiblePaneNav } from '@/lib/bible-pane';

export interface BibleChapterPaneProps {
  nav: BiblePaneNav;
  book: string;
  chapter: number;
  stories?: boolean;
}

export default function BibleChapterScreen(props: { pane?: BibleChapterPaneProps } = {}) {
  const router = useRouter();
  const inPane = !!props.pane;
  // v259: the reader carries the app tab bar too (Study active);
  // the page clears it via the occupied height passed down.
  // v265: in the pane the shell's bar stands below the pane, and
  // the pane container carries the clearance — the page gets 0.
  const tabBarHeight = useTabBarOccupiedHeight();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; stories?: string }>();
  const book = props.pane
    ? props.pane.book
    : typeof params.book === 'string' && params.book ? params.book : '1 Corinthians';
  const chapter = props.pane
    ? props.pane.chapter
    : Math.max(1, parseInt(typeof params.chapter === 'string' ? params.chapter : '1', 10) || 1);
  const stories = props.pane ? !!props.pane.stories : params.stories === '1';

  return (
    <View style={{ flex: 1 }}>
    <BibleScreenBoundary>
      <ChapterPageView
      key={`${book}-${chapter}`}
      book={book}
      chapter={chapter}
      tabBarHeight={inPane ? 0 : tabBarHeight}
      topInsetOverride={inPane ? 0 : undefined}
      initialStories={stories}
      onBack={() => {
        if (props.pane) props.pane.nav.back();
        else router.back();
      }}
      onOpenBook={() => {
        if (props.pane) props.pane.nav.openBook(book);
        else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'book', book }) });
      }}
      onOpenQueue={() => {
        if (props.pane) props.pane.nav.openQueue();
        else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'queue' }) });
      }}
      onListen={() => router.push({ pathname: '/devotional', params: { book, chapter: String(chapter) } })}
      onNavigateChapter={(next) => {
        if (props.pane) props.pane.nav.replaceChapter(book, next);
        else router.navigate({ pathname: '/(tabs)', params: bibleShellParamsForRoute({ name: 'chapter', book, chapter: next }) });
      }}
      />
    </BibleScreenBoundary>
    {inPane ? null : <BibleTabBar />}
    </View>
  );
}
