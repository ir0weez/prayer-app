import {
  View,
  Text,
  Modal,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BOOK_IDS } from '@/lib/book-ids';
import { HighlightColorPicker, HighlightColor, HIGHLIGHT_COLORS } from './highlight-color-picker';
import { parseBibleSections, BibleSection } from '@/lib/bible-section-parser';
import { loadCompletedSections, getSectionCompletionKey } from '@/lib/paragraph-sections';
import { BibleStoryViewer } from './bible-story-viewer';
import { BibleStoriesBar } from './bible-stories-bar';
import { saveBookmark } from '@/lib/bible-bookmark';
import { createDefaultParagraphs, loadCustomParagraphs, parseCustomParagraphs } from '@/lib/paragraph-sections';

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
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [lastTapTime, setLastTapTime] = useState<{ [key: number]: number }>({});
  const [isBibleStudyMode, setIsBibleStudyMode] = useState(false);

  // Local highlights storage key
  const getHighlightsKey = () => `highlights_${book}_${chapter}_${version}`;

  const handleSectionComplete = async () => {
    // Mark section as complete in AsyncStorage
    if (selectedSection) {
      const sectionIndex = sections.findIndex(
        (s) => s.id === selectedSection.id
      );
      if (sectionIndex >= 0 && !completedSections.includes(sectionIndex)) {
        setCompletedSections([...completedSections, sectionIndex]);
        const completionKey = getSectionCompletionKey(book, chapter, selectedSection.id);
        await AsyncStorage.setItem(completionKey, 'true');
      }
    }
  };

  // Note: markSectionComplete is no longer used; use handleSectionComplete instead

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
      const loadSections = async () => {
        // Convert verses to the format needed
        const bibleVerses = verses.map(v => ({
          verse: v.verse,
          text: v.text,
        }));
        
        // First try to load custom paragraphs
        const customDefs = await loadCustomParagraphs(book, chapter, bibleVerses);
        
        let parsedSections: any[];
        if (customDefs) {
          parsedSections = customDefs;
          console.log(`Loaded ${parsedSections.length} custom paragraphs`);
        } else {
          // Use default paragraph grouping
          parsedSections = createDefaultParagraphs(bibleVerses, book, chapter);
          console.log(`Created ${parsedSections.length} default paragraphs`);
        }
        
        setSections(parsedSections);
        
        // Load completed sections for this chapter
        const completedIds = await loadCompletedSections();
        const completed: number[] = [];
        for (let i = 0; i < parsedSections.length; i++) {
          const key = getSectionCompletionKey(book, chapter, parsedSections[i].id);
          if (completedIds.has(key)) {
            completed.push(i);
          }
        }
        setCompletedSections(completed);
      };
      
      loadSections();
    }
  }, [verses, book, chapter]);

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
          console.log('API Response (first 500 chars):', passageText.substring(0, 500));
          
          // Simple regex to extract all verses
          const versePattern = /\[(\d+)\]\s+(.+?)(?=\[\d+\]|$)/gs;
          const parsedVerses: Verse[] = [];
          let match;
          
          while ((match = versePattern.exec(passageText)) !== null) {
            const verseNum = parseInt(match[1]);
            const verseText = match[2]
              .trim()
              .replace(/\n/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/[\u00A0]/g, ' ');
            
            if (verseText.length > 0) {
              parsedVerses.push({
                verse: verseNum,
                text: verseText,
              });
            }
          }
          
          if (parsedVerses.length === 0) {
            throw new Error('No verses found in passage');
          }
          
          console.log(`Parsed ${parsedVerses.length} verses from ${book} ${chapter}`);
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





  const handleBookmarkVerse = async () => {
    if (selectedVerseForHighlight !== null) {
      await saveBookmark(book, chapter, selectedVerseForHighlight, version);
      setBookmarkedVerse(selectedVerseForHighlight);
      // Don't reset - keep the bookmark visible
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
              <View style={{ flexDirection: 'row', marginTop: 4, gap: 8, alignItems: 'center' }}>
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
                <View style={{ width: 1, height: 16, backgroundColor: colors.border, marginHorizontal: 8 }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: colors.muted }}>Study</Text>
                  <Switch
                    value={isBibleStudyMode}
                    onValueChange={setIsBibleStudyMode}
                    trackColor={{ false: '#ccc', true: colors.primary }}
                    thumbColor={isBibleStudyMode ? colors.primary : '#f0f0f0'}
                  />
                </View>
              </View>
            </View>

            <Pressable
              onPress={onMarkComplete}
              style={{ padding: 8 }}
            >
              <MaterialIcons name="check-circle" size={24} color={colors.primary} />
            </Pressable>
          </View>

          {/* Content with Stories Bar at top */}
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
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={true}
            >
              {/* Bible Stories Bar - scrolls with content */}
              <BibleStoriesBar
                sections={sections}
                onSectionPress={(section) => {
                  setSelectedSection(section);
                  setStoryViewerVisible(true);
                }}
                completedSections={completedSections}
                book={book}
              />

              {/* Verses */}
              <View style={{ padding: 16 }}>
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
          {/* Bookmark line indicator - appears on left side */}
          {bookmarkedVerse === verse.verse && (
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                backgroundColor: colors.primary,
              }}
            />
          )}

                    <Pressable
                      onPress={() => {
                        // Check for double-tap to remove bookmark
                        const now = Date.now();
                        const lastTap = lastTapTime[verse.verse] || 0;
                        
                        if (now - lastTap < 300 && bookmarkedVerse === verse.verse) {
                          // Double-tap on bookmarked verse - remove bookmark
                          setBookmarkedVerse(null);
                          setLastTapTime({ ...lastTapTime, [verse.verse]: 0 });
                        } else {
                          // Single tap
                          if (highlight) {
                            // Show remove option
                            alert('Remove this highlight?');
                            handleRemoveHighlight(highlight.id);
                          } else {
                            setSelectedVerseForHighlight(verse.verse);
                            setColorPickerVisible(true);
                          }
                          setLastTapTime({ ...lastTapTime, [verse.verse]: now });
                        }
                      }}
                      onLongPress={() => {
                        handleBookmarkVerse();
                        setSelectedVerseForHighlight(verse.verse);
                      }}
                      delayLongPress={400}
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
              </View>
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
        isBibleStudyMode={isBibleStudyMode}
      />
    </>
  );
}
