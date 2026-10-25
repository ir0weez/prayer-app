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

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChapterPageView } from '@/components/bible-v205/chapter-page';
import { BibleScreenBoundary } from '@/components/bible-v205/screen-boundary';

export default function BibleChapterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; stories?: string }>();
  const book = typeof params.book === 'string' && params.book ? params.book : '1 Corinthians';
  const chapter = Math.max(1, parseInt(typeof params.chapter === 'string' ? params.chapter : '1', 10) || 1);

  return (
    <BibleScreenBoundary>
      <ChapterPageView
      key={`${book}-${chapter}`}
      book={book}
      chapter={chapter}
      initialStories={params.stories === '1'}
      onBack={() => router.back()}
      onOpenBook={() => router.push({ pathname: '/bible-book', params: { book } })}
      onOpenQueue={() => router.push('/bible-queue')}
      onListen={() => router.push({ pathname: '/devotional', params: { book, chapter: String(chapter) } })}
      onNavigateChapter={(next) =>
        router.replace({ pathname: '/bible-chapter', params: { book, chapter: String(next) } })
      }
      />
    </BibleScreenBoundary>
  );
}
