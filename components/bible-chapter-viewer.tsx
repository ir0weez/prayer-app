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
import { GestureHandlerRootView, LongPressGestureHandler } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOK_IDS } from '@/lib/book-ids';
import { HighlightColorPicker, HighlightColor, HIGHLIGHT_COLORS } from './highlight-color-picker';
import { parseBibleSections, BibleSection } from '@/lib/bible-section-parser';
import { BibleStoryViewer } from './bible-story-viewer';
import { saveBookmark } from '@/lib/bible-bookmark';

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

// Type alias for compatibility
type BibleVerse = Verse;

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
  const [sections, setSections] = useState<BibleSection[]>([]);
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState<BibleSection | null>(null);
  const [bookmarkedVerse, setBookmarkedVerse] = useState<number | null>(null);

  // Local highlights storage key
  const getHighlightsKey = () => `highlights_${book}_${chapter}_${version}`;

  // Section completion tracking
  const getSectionCompletionKey = () => `section_completion_${book}_${chapter}`;

  const markSectionComplete = async (sectionId: string) => {
    try {
      const key = getSectionCompletionKey();
      const saved = await AsyncStorage.getItem(key);
      const completed = saved ? JSON.parse(saved) : [];
      if (!completed.includes(sectionId)) {
        completed.push(sectionId);
        await AsyncStorage.setItem(key, JSON.stringify(completed));
      }
    } catch (err) {
      console.error('Error marking section complete:', err);
    }
  };

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

  // Load highlights from AsyncStorage when chapter changes
  useEffect(() => {
    const loadHighlights = async () => {
      try {
        const key = getHighlightsKey();
        const saved = await AsyncStorage.getItem(key);
        if (saved) {
          setHighlights(JSON.parse(saved));
        } else {
          setHighlights([]);
        }
      } catch (err) {
        console.error('Error loading highlights:', err);
      }
    };
    loadHighlights();
  }, [book, chapter, version]);

  // Parse sections when verses load
  useEffect(() => {
    if (verses.length > 0) {
      // Convert Verse[] to BibleVerse[] for parser
      const bibleVerses = verses.map(v => ({
        verse: v.verse,
        text: v.text,
      }));
      const parsed = parseBibleSections(bibleVerses);
      setSections(parsed);
    }
  }, [verses]);

  // Load saved bookmark when chapter changes
  useEffect(() => {
    const loadBookmark = async () => {
      try {
        const { loadBookmark: loadSavedBookmark } = await import('@/lib/bible-bookmark');
        const saved = await loadSavedBookmark();
        if (saved && saved.book === book && saved.chapter === chapter) {
          setBookmarkedVerse(saved.verse);
        } else {
          setBookmarkedVerse(null);
        }
      } catch (err) {
        console.error('Error loading bookmark:', err);
      }
    };
    loadBookmark();
  }, [book, chapter]);

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
    if (!verse) {
      console.error('Verse not found:', verseNumber);
      return;
    }

    try {
      const newHighlight: VerseHighlight = {
        id: Date.now(),
        verse: verseNumber,
        color,
        highlightedText: verse.text,
      };

      // Remove existing highlight for this verse if any
      const updated = highlights.filter((h) => h.verse !== verseNumber);
      updated.push(newHighlight);

      // Save to AsyncStorage
      const key = getHighlightsKey();
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setHighlights(updated);
    } catch (err) {
      console.error('Error creating highlight:', err);
      alert('Failed to create highlight: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle removing a highlight
  const handleRemoveHighlight = async (highlightId: number) => {
    try {
      const updated = highlights.filter((h) => h.id !== highlightId);
      const key = getHighlightsKey();
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      setHighlights(updated);
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
            
            // Only add if it's not empty and doesn't look like a heading
            if (verseText.length > 0) {
              parsedVerses.push({
                verse: parseInt(match[1]),
                text: verseText,
              });
            }
          }
          
          if (parsedVerses.length === 0) {
            throw new Error('No verses found in passage');
          }
          
          // Convert to BibleVerse format for section parser
          const bibleVerses = parsedVerses.map(v => ({
            verse: v.verse,
            text: v.text,
          }));
          
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

  const handleOpenStory = (section: BibleSection) => {
    setSelectedSection(section);
    setStoryViewerVisible(true);
  };

  const handleSectionComplete = async () => {
    if (selectedSection) {
      await markSectionComplete(selectedSection.id);
    }
  };

  const handleBookmarkVerse = async () => {
    if (selectedVerseForHighlight !== null) {
      await saveBookmark(book, chapter, selectedVerseForHighlight, version);
      setBookmarkedVerse(selectedVerseForHighlight);
      // Reset after 1 second
      setTimeout(() => setBookmarkedVerse(null), 1000);
    }
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

          {/* Section Indicators */}
          {sections.length > 1 && (
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 8,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexWrap: 'wrap',
              }}
            >
              {sections.map((section, index) => (
                <Pressable
                  key={section.id}
                  onPress={() => handleOpenStory(section)}
                  style={({ pressed }) => [{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  }]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: colors.primary,
                    }}
                  >
                    {index + 1}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

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
                      position: 'relative',
                    }}
                  >
                    {/* Bookmark line indicator */}
                    {bookmarkedVerse === verse.verse && (
                      <View
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          backgroundColor: colors.primary,
                          borderRadius: 2,
                        }}
                      />
                    )}

                    <LongPressGestureHandler
                      onActivated={() => {
                        handleBookmarkVerse();
                        setSelectedVerseForHighlight(verse.verse);
                      }}
                      minDurationMs={500}
                    >
                      <Pressable
                        onPress={() => {
                          if (highlight) {
                            // Show remove option
                            alert('Remove this highlight?');
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
                            color: bookmarkedVerse === verse.verse ? colors.primary : colors.primary,
                            minWidth: 24,
                            textDecorationLine: bookmarkedVerse === verse.verse ? 'underline' : 'none',
                            fontWeight: bookmarkedVerse === verse.verse ? '700' : '600',
                          }}
                        >
                          {verse.verse}
                        </Text>
                      </Pressable>
                    </LongPressGestureHandler>
                    <Text
                      style={{
                        fontSize: 17,
                        lineHeight: 27,
                        color: colors.foreground,
                        fontFamily: 'Georgia',
                        flex: 1,
                        marginLeft: 8,
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

      {/* Story Viewer Modal */}
      <BibleStoryViewer
        visible={storyViewerVisible}
        section={selectedSection}
        onClose={() => setStoryViewerVisible(false)}
        onComplete={() => {
          handleSectionComplete();
          setStoryViewerVisible(false);
        }}
        book={book}
        chapter={chapter}
        version="kjv"
      />
    </>
  );
}
