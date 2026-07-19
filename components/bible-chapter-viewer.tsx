import React, { useState, useEffect } from 'react';
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
 * Displays KJV Bible text for a given book and chapter
 * Uses the Bible API (api.scripture.api.bible) to fetch verses
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

  // Fetch Bible verses from public Bible API
  useEffect(() => {
    if (!visible) return;

    const fetchVerses = async () => {
      setLoading(true);
      setError(null);
      try {
        // Using a free public Bible API
        // Book names need to be formatted correctly (e.g., "Genesis" for Genesis)
        const bookName = book.toLowerCase();
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/06125adad2d5898a-01/search?query=${bookName}+${chapter}&limit=1000`,
          {
            headers: {
              'api-key': 'PLACEHOLDER_KEY', // This is a public endpoint that doesn't require auth for basic searches
            },
          }
        );

        if (!response.ok) {
          // Fallback: Use a simpler public API that doesn't require auth
          const fallbackResponse = await fetch(
            `https://bible-api.com/${book}+${chapter}?translation=kjv`
          );
          
          if (!fallbackResponse.ok) {
            throw new Error('Failed to fetch Bible verses');
          }

          const data = await fallbackResponse.json();
          
          // Parse verses from the response
          if (data.verses) {
            const parsedVerses: BibleVerse[] = data.verses.map(
              (verse: any) => ({
                verse: verse.verse,
                text: verse.text,
              })
            );
            setVerses(parsedVerses);
          }
        } else {
          const data = await response.json();
          // Parse the response based on the API structure
          if (data.results && data.results.length > 0) {
            const parsedVerses: BibleVerse[] = data.results.map(
              (result: any, index: number) => ({
                verse: index + 1,
                text: result.preview || result.text || '',
              })
            );
            setVerses(parsedVerses);
          }
        }
      } catch (err) {
        console.error('Error fetching Bible verses:', err);
        setError('Failed to load Bible chapter. Please try again.');
        // Set sample Genesis 1 verses as fallback for testing
        setVerses(getGenesisOneKJV());
      } finally {
        setLoading(false);
      }
    };

    fetchVerses();
  }, [visible, book, chapter]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={onClose} style={{ padding: 8 }}>
            <MaterialIcons name="close" size={24} color={colors.foreground} />
          </Pressable>

          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: colors.foreground,
            }}
          >
            {book} {chapter} (KJV)
          </Text>

          {onMarkComplete && (
            <Pressable
              onPress={onMarkComplete}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
            </Pressable>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                color: colors.error,
                fontSize: 16,
                textAlign: 'center',
              }}
            >
              {error}
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            {verses.map((verse, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    lineHeight: 22,
                    color: colors.foreground,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: '600',
                      color: colors.primary,
                    }}
                  >
                    {verse.verse}
                  </Text>
                  {' '}
                  {verse.text}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Fallback Genesis 1 KJV verses for testing
 */
function getGenesisOneKJV(): BibleVerse[] {
  return [
    {
      verse: 1,
      text: 'In the beginning God created the heaven and the earth.',
    },
    {
      verse: 2,
      text: 'And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.',
    },
    {
      verse: 3,
      text: 'And God said, Let there be light: and there was light.',
    },
    {
      verse: 4,
      text: 'And God saw the light, that it was good: and God divided the light from the darkness.',
    },
    {
      verse: 5,
      text: 'And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day.',
    },
    {
      verse: 6,
      text: 'And God said, Let there be a firmament in the midst of the waters, and let it divide the waters from the waters.',
    },
    {
      verse: 7,
      text: 'And God made the firmament, and divided the waters which were under the firmament from the waters which were above the firmament: and it was so.',
    },
    {
      verse: 8,
      text: 'And God called the firmament Heaven. And the evening and the morning were the second day.',
    },
    {
      verse: 9,
      text: 'And God said, Let the waters under the heaven be gathered together unto one place, and let the dry land appear: and it was so.',
    },
    {
      verse: 10,
      text: 'And God called the dry land Earth; and the gathering together of the waters called he Seas: and God saw that it was good.',
    },
  ];
}
