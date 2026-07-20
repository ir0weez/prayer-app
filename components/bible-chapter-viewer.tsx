import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';

export interface BibleChapterViewerProps {
  visible: boolean;
  book: string;
  chapter: number;
  onClose: () => void;
  onMarkComplete?: () => void;
}

interface Verse {
  verse: number;
  text: string;
}

/**
 * Bible Chapter Viewer Modal
 * Displays Bible text for a given book and chapter using bible-api.com
 */
export function BibleChapterViewer({
  visible,
  book,
  chapter,
  onClose,
  onMarkComplete,
}: BibleChapterViewerProps) {
  const colors = useColors();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Bible verses when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);
      setVerses([]);

      try {
        // Fetch from bible-api.com using the passage format: "Book Chapter"
        const response = await fetch(
          `https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${book} ${chapter}`);
        }

        const data = await response.json();

        // Parse verses from the API response
        if (data.verses && Array.isArray(data.verses)) {
          const parsedVerses: Verse[] = data.verses.map((v: any) => ({
            verse: v.verse,
            text: v.text.trim(),
          }));
          setVerses(parsedVerses);
        } else {
          throw new Error('No verses found in response');
        }
      } catch (err) {
        console.error('Error loading Bible chapter:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [visible, book, chapter]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={28} color={colors.foreground} />
          </Pressable>
          
          <Text
            style={{
              fontSize: 16,
              fontWeight: '700',
              color: colors.foreground,
              flex: 1,
              textAlign: 'center',
              marginHorizontal: 12,
            }}
            numberOfLines={1}
          >
            {book} {chapter}
          </Text>

          <Pressable
            onPress={onMarkComplete}
            style={{ padding: 8 }}
          >
            <MaterialIcons name="check-circle" size={28} color={colors.primary} />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 16,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 16, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : verses.length > 0 ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={true}
          >
            {verses.map((verse) => (
              <View key={verse.verse} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 17,
                    lineHeight: 26,
                    color: colors.foreground,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: colors.primary,
                      marginRight: 4,
                    }}
                  >
                    {verse.verse}
                  </Text>
                  {verse.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.muted, fontSize: 16 }}>
              No verses found
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
