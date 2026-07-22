import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOK_IDS } from '@/lib/book-ids';
import { HighlightColorPicker, HighlightColor, HIGHLIGHT_COLORS } from './highlight-color-picker';
import { trpc } from '@/lib/trpc';

export interface BibleChapterViewerProps {
  visible: boolean;
  book: string;
  chapter: number;
  onClose: () => void;
  onMarkComplete: () => Promise<void>;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

interface Verse {
  verse: number;
  text: string;
}

interface VerseHighlight {
  id: number;
  verse: number;
  color: HighlightColor;
  highlightedText: string;
}

export function BibleChapterViewer({
  visible,
  book,
  chapter,
  onClose,
  onMarkComplete,
  onPreviousChapter,
  onNextChapter,
  canGoPrevious,
  canGoNext,
}: BibleChapterViewerProps) {
  const colors = useColors();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<'kjv' | 'csb'>('kjv');
  const [highlights, setHighlights] = useState<VerseHighlight[]>([]);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [selectedVerseForHighlight, setSelectedVerseForHighlight] = useState<number | null>(null);

  // API calls
  const getHighlights = trpc.highlights.getChapterHighlights.useQuery(
    { book, chapter, version },
    { enabled: visible }
  );

  const createHighlight = trpc.highlights.create.useMutation();
  const deleteHighlight = trpc.highlights.delete.useMutation();

  // Load saved version preference on mount
  useEffect(() => {
    const loadVersionPreference = async () => {
      try {
        const savedVersion = await AsyncStorage.getItem('bibleVersion');
        if (savedVersion === 'kjv' || savedVersion === 'csb') {
          setVersion(savedVersion);
        }
      } catch (err) {
        console.error('Error loading version preference:', err);
      }
    };
    loadVersionPreference();
  }, []);

  // Load highlights when chapter changes
  useEffect(() => {
    if (getHighlights.data) {
      const formattedHighlights: VerseHighlight[] = getHighlights.data.map((h: any) => ({
        id: h.id,
        verse: h.verse,
        color: h.color as HighlightColor,
        highlightedText: h.highlightedText,
      }));
      setHighlights(formattedHighlights);
    }
  }, [getHighlights.data]);

  // Save version preference when it changes
  const handleVersionChange = async (newVersion: 'kjv' | 'csb') => {
    setVersion(newVersion);
    try {
      await AsyncStorage.setItem('bibleVersion', newVersion);
    } catch (err) {
      console.error('Error saving version preference:', err);
    }
  };

  // Handle highlighting a verse
  const handleHighlightVerse = async (verseNumber: number, color: HighlightColor) => {
    const verse = verses.find((v) => v.verse === verseNumber);
    if (!verse) return;

    try {
      await createHighlight.mutateAsync({
        book,
        chapter,
        verse: verseNumber,
        version,
        highlightedText: verse.text,
        color,
      });

      // Refresh highlights
      await getHighlights.refetch();
    } catch (err) {
      console.error('Error creating highlight:', err);
    }
  };

  // Handle removing a highlight
  const handleRemoveHighlight = async (highlightId: number) => {
    try {
      await deleteHighlight.mutateAsync({ id: highlightId });
      // Refresh highlights
      await getHighlights.refetch();
    } catch (err) {
      console.error('Error deleting highlight:', err);
    }
  };

  // Load Bible verses when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    const loadVerses = async () => {
      setLoading(true);
      setError(null);
      setVerses([]);

      try {
        // Map version to API.Bible bible ID
        const bibleIds: { [key: string]: string } = {
          'kjv': 'de4e12af7f28f599-02',
          'csb': 'a556c5305ee15c3f-01',
        };
        const bibleId = bibleIds[version];
        const apiKey = process.env.EXPO_PUBLIC_APIBIBLE_KEY;

        if (!apiKey) {
          throw new Error('API.Bible key not configured');
        }

        // Get book ID from mapping
        const bookId = BOOK_IDS[book];
        if (!bookId) {
          throw new Error(`Book "${book}" not found`);
        }

        // Fetch from API.Bible using chapters endpoint
        const response = await fetch(
          `https://api.scripture.api.bible/v1/bibles/${bibleId}/chapters/${bookId}.${chapter}?content-type=text&include-notes=false`,
          {
            headers: {
              'api-key': apiKey,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to load ${book} ${chapter}`);
        }

        const data = await response.json();

        // Parse verses from the API response
        if (data.data && data.data.content) {
          const passageText = data.data.content;
          
          // Parse verse numbers and text from the passage
          // Format: [1] Verse text [2] More text [3] Another verse
          const versePattern = /\[(\d+)\]\s+(.+?)(?=\[\d+\]|$)/gs;
          const parsedVerses: Verse[] = [];
          let match;
          
          while ((match = versePattern.exec(passageText)) !== null) {
            const verseText = match[2]
              .trim()
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/[\u00A0]/g, ' '); // Replace non-breaking spaces
            
            parsedVerses.push({
              verse: parseInt(match[1]),
              text: verseText,
            });
          }
          
          if (parsedVerses.length === 0) {
            throw new Error('No verses found in passage');
          }
          
          setVerses(parsedVerses);
        } else {
          throw new Error('No passages found in response');
        }
      } catch (err) {
        console.error('Error loading Bible chapter:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chapter');
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [visible, book, chapter, version]);

  const getVerseHighlight = (verseNumber: number) => {
    return highlights.find((h) => h.verse === verseNumber);
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingTop: 48,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={onClose} style={{ padding: 8 }}>
              <MaterialIcons name="close" size={24} color={colors.foreground} />
            </Pressable>

            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '700',
                  color: colors.foreground,
                }}
                numberOfLines={1}
              >
                {book} {chapter}
              </Text>
              <View style={{ flexDirection: 'row', marginTop: 4, gap: 8 }}>
                <Pressable
                  onPress={() => handleVersionChange('kjv')}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: version === 'kjv' ? colors.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: version === 'kjv' ? '#fff' : colors.muted,
                    }}
                  >
                    KJV
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleVersionChange('csb')}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 4,
                    backgroundColor: version === 'csb' ? colors.primary : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: version === 'csb' ? '#fff' : colors.muted,
                    }}
                  >
                    CSB
                  </Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              onPress={onMarkComplete}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Content */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : error ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
              <Text style={{ color: colors.error, textAlign: 'center' }}>
                Failed to load {book} {chapter}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
            >
              {verses.map((verse) => {
                const highlight = getVerseHighlight(verse.verse);
                const highlightBgColor = highlight ? HIGHLIGHT_COLORS[highlight.color].bg : 'transparent';

                return (
                  <View
                    key={verse.verse}
                    style={{
                      marginBottom: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: highlightBgColor,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                    }}
                  >
                    <Pressable
                      onPress={() => {
                        if (highlight) {
                          handleRemoveHighlight(highlight.id);
                        } else {
                          setSelectedVerseForHighlight(verse.verse);
                          setColorPickerVisible(true);
                        }
                      }}
                      style={({ pressed }) => [{
                        marginRight: 8,
                        marginTop: 2,
                        opacity: pressed ? 0.6 : 1,
                      }]}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: colors.primary,
                          minWidth: 24,
                        }}
                      >
                        {verse.verse}
                      </Text>
                    </Pressable>
                    <Text
                      style={{
                        fontSize: 17,
                        lineHeight: 27,
                        color: colors.foreground,
                        fontFamily: 'Georgia',
                        flex: 1,
                      }}
                      selectable
                    >
                      {verse.text}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Floating Pill Navigation */}
          <View
            style={{
              position: 'absolute',
              bottom: 24,
              left: 0,
              right: 0,
              alignItems: 'center',
              pointerEvents: 'box-none',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: colors.surface,
                borderRadius: 32,
                borderWidth: 1,
                borderColor: colors.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Pressable
                onPress={onPreviousChapter}
                disabled={!canGoPrevious}
                style={({ pressed }) => [
                  { padding: 8, opacity: !canGoPrevious ? 0.3 : pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={24}
                  color={colors.foreground}
                />
              </Pressable>

              <Text
                style={{
                  marginHorizontal: 16,
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.foreground,
                }}
              >
                Chapter {chapter}
              </Text>

              <Pressable
                onPress={onNextChapter}
                disabled={!canGoNext}
                style={({ pressed }) => [
                  { padding: 8, opacity: !canGoNext ? 0.3 : pressed ? 0.6 : 1 },
                ]}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={24}
                  color={colors.foreground}
                />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Color Picker Modal */}
      <HighlightColorPicker
        visible={colorPickerVisible}
        onSelectColor={(color) => {
          if (selectedVerseForHighlight !== null) {
            handleHighlightVerse(selectedVerseForHighlight, color);
            setColorPickerVisible(false);
            setSelectedVerseForHighlight(null);
          }
        }}
        onClose={() => {
          setColorPickerVisible(false);
          setSelectedVerseForHighlight(null);
        }}
      />
    </>
  );
}
