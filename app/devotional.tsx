// ─── Devotional route (v230 → v293) ─────────────────────────────────────────
// Thin shell over the player screen. Which devotional shows is decided
// by, in order: the route's own book/chapter params (the chapter page's
// doors pass them), or the shared player's live session (the pill's
// expand lands here). There is deliberately NO default chapter: the
// old bare-param default to Genesis 1 could play Genesis 1 from
// another chapter's context, and v293 removes it — with no params and
// no session, the route says plainly where devotionals live.
//
// A chapter without a registry entry gets a plain word, never a dead
// player; the registry alone decides (lib/devotionals.ts).

import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DevotionalListenView } from '@/components/devotional-listen';
import { getDevotional, type Devotional } from '@/lib/devotionals';
import { useDevotionalPlayerState } from '@/lib/devotional-player';

export default function DevotionalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book?: string; chapter?: string }>();
  const session = useDevotionalPlayerState();

  const hasParams =
    typeof params.book === 'string' && !!params.book && typeof params.chapter === 'string' && !!params.chapter;

  let devotional: Devotional | null = null;
  let missingLabel: string | null = null;
  if (hasParams) {
    const book = params.book as string;
    const chapter = Math.max(1, parseInt(params.chapter as string, 10) || 1);
    devotional = getDevotional(book, chapter);
    if (!devotional) missingLabel = `${book} ${chapter}`;
  } else if (session.devotional) {
    devotional = session.devotional;
  }

  if (!devotional) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: insets.top }}>
        <Text style={{ fontSize: 15, textAlign: 'center', marginBottom: 16 }}>
          {missingLabel
            ? `No devotional for ${missingLabel} yet.`
            : 'Devotionals live on their chapters — open a chapter and tap Devotional to listen.'}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ fontSize: 14, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
      </View>
    );
  }

  return <DevotionalListenView devotional={devotional} onBack={() => router.back()} />;
}
