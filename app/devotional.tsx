// ─── v230 devotional route ───────────────────────────────────────────────────
// Thin shell over the listen screen; the registry alone decides whether a
// chapter has a devotional — a chapter without one gets a plain word, never
// a dead player.

import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DevotionalListenView } from '@/components/devotional-listen';
import { getDevotional } from '@/lib/devotionals';

export default function DevotionalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book?: string; chapter?: string }>();
  const book = typeof params.book === 'string' && params.book ? params.book : 'Genesis';
  const chapter = Math.max(1, parseInt(typeof params.chapter === 'string' ? params.chapter : '1', 10) || 1);
  const devotional = getDevotional(book, chapter);

  if (!devotional) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingTop: insets.top }}>
        <Text style={{ fontSize: 15, textAlign: 'center', marginBottom: 16 }}>
          No devotional has been recorded for {book} {chapter} yet.
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Text style={{ fontSize: 14, fontWeight: '700' }}>‹ Back</Text>
        </Pressable>
      </View>
    );
  }

  return <DevotionalListenView devotional={devotional} onBack={() => router.back()} />;
}
