// ─── v205 chapter route ──────────────────────────────────────────────────────
// Thin shell over the polished chapter page; all of the surface lives in
// components/bible-v205/chapter-page.tsx.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChapterPageView } from '@/components/bible-v205/chapter-page';

export default function BibleChapterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ book?: string; chapter?: string; stories?: string }>();
  const book = typeof params.book === 'string' && params.book ? params.book : '1 Corinthians';
  const chapter = Math.max(1, parseInt(typeof params.chapter === 'string' ? params.chapter : '1', 10) || 1);

  return (
    <ChapterPageView
      key={`${book}-${chapter}`}
      book={book}
      chapter={chapter}
      initialStories={params.stories === '1'}
      onBack={() => router.back()}
      onOpenBook={() => router.push({ pathname: '/bible-book', params: { book } })}
      onOpenQueue={() => router.push('/bible-queue')}
      onNavigateChapter={(next) =>
        router.replace({ pathname: '/bible-chapter', params: { book, chapter: String(next) } })
      }
    />
  );
}
