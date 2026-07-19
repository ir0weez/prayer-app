import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
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

interface ChapterVerse {
  verse: number;
  text: string;
}

// Map book names to their API IDs
const BOOK_ID_MAP: Record<string, string> = {
  'Genesis': 'GEN',
  '1 Thessalonians': '1TH',
  '2 Thessalonians': '2TH',
  '1 Corinthians': '1CO',
  '2 Corinthians': '2CO',
  'Romans': 'ROM',
  'Galatians': 'GAL',
  'Ephesians': 'EPH',
  'Philippians': 'PHP',
  'Colossians': 'COL',
  '1 Timothy': '1TI',
  '2 Timothy': '2TI',
  'Titus': 'TIT',
  'Philemon': 'PHM',
  'Hebrews': 'HEB',
  'James': 'JAS',
  '1 Peter': '1PE',
  '2 Peter': '2PE',
  '1 John': '1JO',
  '2 John': '2JO',
  '3 John': '3JO',
  'Jude': 'JUD',
  'Revelation': 'REV',
  'Matthew': 'MAT',
  'Mark': 'MRK',
  'Luke': 'LUK',
  'John': 'JHN',
  'Acts': 'ACT',
};

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
  const [verses, setVerses] = useState<ChapterVerse[]>([]);
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
        // Get the book ID from the map
        const bookId = BOOK_ID_MAP[book];
        if (!bookId) {
          throw new Error(`Book "${book}" not found in database`);
        }

        // Fetch from the Free Bible API using KJV translation
        const response = await fetch(
          `https://bible.helloao.org/api/kjv/${bookId}/${chapter}.json`
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${book} ${chapter}`);
        }

        const data = await response.json();

        // Parse verses from the chapter content
        if (data.chapter?.content) {
          const parsedVerses: ChapterVerse[] = [];
          
          for (const content of data.chapter.content) {
            if (content.type === 'verse') {
              // Concatenate verse text if it's an array
              const verseText = Array.isArray(content.content)
                ? content.content.join('')
                : content.content;
              
              parsedVerses.push({
                verse: content.number,
                text: verseText,
              });
            }
          }

          setVerses(parsedVerses);
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
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: 12 }}>
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
              fontSize: 18,
              fontWeight: '700',
              color: colors.foreground,
              flex: 1,
              textAlign: 'center',
              marginHorizontal: 12,
            }}
          >
            {book} {chapter} (KJV)
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
      </View>
    </Modal>
  );
}
