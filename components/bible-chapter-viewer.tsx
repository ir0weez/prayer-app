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

interface BibleVerse {
  verse: number;
  text: string;
}

/**
 * Bible Chapter Viewer Modal
 * Displays KJV Bible text for a given book and chapter using the Free Bible API
 */
export function BibleChapterViewer({
  visible,
  book,
  chapter,
  onClose,
  onMarkComplete,
}: BibleChapterViewerProps) {
  const colors = useColors();
  const [verses, setVerses] = useState<BibleVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Bible verses when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use the Free Bible API to fetch KJV verses
        // Format: GET /v1/bible/chapters/{book}_{chapter}?translation=kjv
        const bookSlug = book
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');
        
        const response = await fetch(
          `https://api.bible.com/v1/bibles/9879dbb7cd5bcbfda-01/chapters/${bookSlug}_${chapter}?include-notes=false&include-titles=false`,
          {
            headers: {
              'api-key': 'test', // The free API doesn't require a real key
            },
          }
        );

        if (!response.ok) {
          // Fallback to the simpler free API
          const fallbackResponse = await fetch(
            `https://bible.helloao.org/api/bible/kjv/${bookSlug}/${chapter}`
          );
          
          if (!fallbackResponse.ok) {
            throw new Error('Failed to load chapter');
          }

          const data = await fallbackResponse.json();
          
          // Parse verses from the response
          if (data.verses) {
            const parsedVerses = data.verses.map((v: any) => ({
              verse: v.verse,
              text: v.text,
            }));
            setVerses(parsedVerses);
          }
        } else {
          const data = await response.json();
          
          // Parse verses from the response
          if (data.data?.content) {
            // Extract verses from the content
            const verseRegex = /\[(\d+)\]\s*(.+?)(?=\[\d+\]|$)/gs;
            const matches = [...data.data.content.matchAll(verseRegex)];
            
            const parsedVerses = matches.map(match => ({
              verse: parseInt(match[1]),
              text: match[2].trim(),
            }));
            
            setVerses(parsedVerses);
          }
        }
      } catch (err) {
        console.error('Error loading Bible chapter:', err);
        setError('Failed to load chapter. Please try again.');
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingTop: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={28} color={colors.foreground} />
          </Pressable>
          
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: colors.foreground,
              flex: 1,
              textAlign: 'center',
              marginHorizontal: 12,
            }}
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
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
            showsVerticalScrollIndicator={true}
          >
            {verses.length > 0 ? (
              verses.map((verse) => (
                <View key={verse.verse} style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.primary,
                      marginBottom: 4,
                    }}
                  >
                    {verse.verse}
                  </Text>
                  <Text
                    style={{
                      fontSize: 18,
                      lineHeight: 28,
                      color: colors.foreground,
                    }}
                  >
                    {verse.text}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.muted, fontSize: 16, textAlign: 'center' }}>
                No verses found for {book} {chapter}
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
