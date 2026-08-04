import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { BibleSection, BibleVerse } from '@/lib/bible-section-parser';
import { saveBookmark } from '@/lib/bible-bookmark';
import { isVerseHighlighted, addHighlight, removeHighlight } from '@/lib/bible-highlight';
import {
  getCommentary,
  getAllCommentariesForVerse,
  toggleLike,
  toggleBookmark,
  CommentaryNote,
} from '@/lib/commentary-data';

interface BibleStoryViewerProps {
  visible: boolean;
  section: BibleSection | null;
  onClose: () => void;
  onComplete?: () => void;
  onChapterComplete?: () => void;
  onReset?: () => void;
  book: string;
  chapter: number;
  version?: 'kjv' | 'csb';
  isBibleStudyMode?: boolean;
  totalVerses?: number;
  currentVerseOffset?: number;
  isLastSection?: boolean;
  sections?: BibleSection[];
  onSectionChange?: (section: BibleSection) => void;
}

export function BibleStoryViewer({
  visible,
  section,
  onClose,
  onComplete,
  onChapterComplete,
  onReset,
  book,
  chapter,
  version = 'kjv',
  isBibleStudyMode = false,
  totalVerses = 0,
  currentVerseOffset = 0,
  isLastSection = false,
  sections = [],
  onSectionChange,
}: BibleStoryViewerProps) {
  const colors = useColors();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<'yellow' | 'green' | 'pink' | 'blue'>('yellow');
  const [showCommentaryModal, setShowCommentaryModal] = useState(false);
  const [isCommentaryLiked, setIsCommentaryLiked] = useState(false);
  const [commentaries, setCommentaries] = useState<CommentaryNote[]>([]);
  const [isLoadingCommentary, setIsLoadingCommentary] = useState(false);
  const [showChapterComplete, setShowChapterComplete] = useState(false);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible && section) {
      setCurrentVerseIndex(0);
      setShowChapterComplete(false);
      loadCommentary();
    }
  }, [visible, section]);

  useEffect(() => {
    loadCommentary();
    checkHighlightStatus();
  }, [currentVerseIndex]);

  const checkHighlightStatus = async () => {
    if (!section || !section.verses || section.verses.length === 0) return;
    const currentVerse = section.verses[currentVerseIndex];
    if (!currentVerse || !currentVerse.verse) {
      setIsHighlighted(false);
      return;
    }
    const highlighted = await isVerseHighlighted(book, chapter, currentVerse.verse, version);
    setIsHighlighted(highlighted);
  };

  const loadCommentary = async () => {
    if (!section || !section.verses || section.verses.length === 0) return;
    setIsLoadingCommentary(true);
    
    if (isBibleStudyMode) {
      // In study mode, load commentary for ALL verses and combine them
      const allComments: CommentaryNote[] = [];
      for (const verse of section.verses) {
        if (verse.verse) {
          const data = await getAllCommentariesForVerse(book, chapter, verse.verse);
          allComments.push(...data);
        }
      }
      setCommentaries(allComments);
      setIsCommentaryLiked(allComments.length > 0 ? (allComments[0]?.isLikedByUser ?? false) : false);
    } else {
      // In normal mode, load commentary for the current verse
      const verseToLoad = section.verses[currentVerseIndex];
      if (!verseToLoad || !verseToLoad.verse) {
        setIsLoadingCommentary(false);
        return;
      }
      const data = await getAllCommentariesForVerse(book, chapter, verseToLoad.verse);
      setCommentaries(data);
      setIsCommentaryLiked(data.length > 0 ? (data[0]?.isLikedByUser ?? false) : false);
    }
    setIsLoadingCommentary(false);
  };

  const handleToggleLike = async () => {
    if (commentaries.length === 0) return;
    await toggleLike(commentaries[0].id);
    setIsCommentaryLiked(!isCommentaryLiked);
    await loadCommentary();
  };

  const handleToggleBookmark = async () => {
    if (commentaries.length === 0) return;
    await toggleBookmark(commentaries[0].id);
    await loadCommentary();
  };

  if (!section) {
    return null;
  }
  
  if (!section.verses || section.verses.length === 0) {
    return null;
  }

  const currentVerse = isBibleStudyMode 
    ? section.verses[section.verses.length - 1] 
    : section.verses[currentVerseIndex];
  const isLastVerse = currentVerseIndex === section.verses.length - 1;

  const handleNextVerse = () => {
    if (isBibleStudyMode) {
      // In study mode, this completes the section
      if (isLastSection) {
        // Last section - show chapter complete screen
        if (onComplete) onComplete();
        setShowChapterComplete(true);
      }
      // Don't call onComplete for non-last sections in study mode
    } else {
      // In normal mode, go to next verse
      if (currentVerseIndex < section.verses.length - 1) {
        setCurrentVerseIndex(currentVerseIndex + 1);
      } else if (isLastVerse) {
        if (isLastSection) {
          // Last verse of last section - show chapter complete screen
          if (onComplete) onComplete();
          setShowChapterComplete(true);
        } else if (sections.length > 0 && section) {
          // Auto-advance to next section
          const currentSectionIndex = sections.findIndex(s => s.id === section.id);
          if (currentSectionIndex >= 0 && currentSectionIndex < sections.length - 1) {
            const nextSection = sections[currentSectionIndex + 1];
            if (onSectionChange) {
              onSectionChange(nextSection);
              setCurrentVerseIndex(0);
            }
          }
        }
      }
    }
  };

  const handlePreviousVerse = () => {
    if (!isBibleStudyMode && currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  const handleBookmark = async () => {
    if (currentVerse) {
      await saveBookmark(book, chapter, currentVerse.verse, version);
      setIsBookmarked(!isBookmarked);
    }
  };

  const handleHighlight = async () => {
    setShowColorPicker(true);
  };

  const handleColorSelected = async (color: 'yellow' | 'green' | 'pink' | 'blue') => {
    if (!currentVerse) return;
    
    try {
      if (isHighlighted) {
        await removeHighlight(book, chapter, currentVerse.verse, version);
      }
      await addHighlight(book, chapter, currentVerse.verse, currentVerse.text, version, color);
      setSelectedHighlightColor(color);
      setIsHighlighted(true);
      setShowColorPicker(false);
    } catch (error) {
      console.error('Error highlighting verse:', error);
    }
  };

  // In study mode, show all verses; in normal mode, show just current verse
  const verseRange = isBibleStudyMode 
    ? `${section.verses[0].verse}-${section.verses[section.verses.length - 1].verse}`
    : `${currentVerse?.verse}`;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: '#2D8659',
          }}
        >
          {/* Header with progress and verse count */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            {/* Section progress indicator */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              Section {sections.length > 0 ? sections.findIndex(s => s.id === section?.id) + 1 : 1} of {sections.length || 1}
            </Text>

            {/* Verse count pill */}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: 'white',
                }}
              >
                {currentVerseIndex + 1} of {section?.verses.length || 0}
              </Text>
            </View>
          </View>

          {/* Main content container */}
          <View
            style={{
              flex: 1,
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingVertical: 40,
            }}
          >
            {/* Top section - verse content */}
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {/* Verse number(s) */}
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: 24,
                  textAlign: 'center',
                }}
              >
                {verseRange}
              </Text>

              {/* Verse text(s) - scrollable in study mode */}
              {isBibleStudyMode ? (
                <ScrollView
                  style={{ flex: 1, width: '100%', marginBottom: 40 }}
                  contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 8, alignItems: 'center' }}
                  showsVerticalScrollIndicator={true}
                >
                  {section.verses.map((verse, idx) => (
                    <View key={`verse-${verse.verse}-${idx}`} style={{ marginBottom: 20, maxWidth: 300, alignItems: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '600',
                            color: 'rgba(255,255,255,0.7)',
                            marginRight: 12,
                            marginTop: 4,
                            minWidth: 24,
                            textAlign: 'right',
                          }}
                        >
                          {verse.verse}
                        </Text>
                        <Text
                          style={{
                            fontSize: 18,
                            lineHeight: 28,
                            color: 'white',
                            fontFamily: 'Georgia',
                            fontWeight: '500',
                            textAlign: 'center',
                            letterSpacing: 0.3,
                          }}
                        >
                          {verse.text}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text
                  style={{
                    fontSize: 22,
                    lineHeight: 36,
                    color: 'white',
                    textAlign: 'center',
                    fontFamily: 'Georgia',
                    fontWeight: '500',
                    marginBottom: 40,
                    letterSpacing: 0.3,
                  }}
                >
                  {currentVerse?.text ?? 'Verse text not available'}
                </Text>
              )}

              {/* Bookmark and Highlight buttons - hidden in Study mode */}
              {!isBibleStudyMode && (
                <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'center' }}>
                  <Pressable
                    onPress={handleBookmark}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 24,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.6)',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                      {isBookmarked ? '✓ Bookmarked' : 'Bookmark'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleHighlight}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 24,
                        borderWidth: 1.5,
                        borderColor: isHighlighted ? 'rgba(255,193,7,0.8)' : 'rgba(255,255,255,0.6)',
                        backgroundColor: isHighlighted ? 'rgba(255,193,7,0.2)' : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: isHighlighted ? '#FFC107' : 'white', fontSize: 14, fontWeight: '600' }}>
                      {isHighlighted ? '★ Highlighted' : 'Highlight'}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Bottom section - commentary pill button */}
            <Pressable
              onPress={() => setShowCommentaryModal(true)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 28,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.3)',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <MaterialIcons name="comment" size={18} color="white" />
              <Text style={{ color: 'white', fontSize: 14, fontWeight: '500' }}>
                {commentaries.length > 0 ? 'View' : 'No'} Commentary
              </Text>
            </Pressable>
          </View>

          {/* X button - BOTTOM LEFT */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              {
                position: 'absolute',
                bottom: 28,
                left: 28,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: 'rgba(0,0,0,0.3)',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 20,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons name="close" size={28} color="white" />
          </Pressable>

          {/* Verse counter - TOP LEFT for total, BOTTOM RIGHT for section */}
          {totalVerses > 0 && !isBibleStudyMode && (
            <View
              pointerEvents="auto"
              style={{
                position: 'absolute',
                top: 28,
                left: 28,
                backgroundColor: 'rgba(0,0,0,0.2)',
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                zIndex: 20,
              }}
            >
              <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
                Verse {currentVerseOffset + currentVerseIndex + 1} of {totalVerses}
              </Text>
            </View>
          )}

          {/* Section counter - BOTTOM RIGHT */}
          <View
            pointerEvents="auto"
            style={{
              position: 'absolute',
              bottom: 28,
              right: 28,
              backgroundColor: 'rgba(0,0,0,0.2)',
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 24,
              zIndex: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
              {isBibleStudyMode ? 'Study Mode' : `${currentVerseIndex + 1} / ${section.verses.length}`}
            </Text>
          </View>

          {/* Left tap area - previous verse */}
          <Pressable
            onPress={handlePreviousVerse}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '30%',
              zIndex: 15,
            }}
          />

          {/* Right tap area - next verse */}
          <Pressable
            onPress={handleNextVerse}
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: '30%',
              zIndex: 15,
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Commentary Modal */}
      <Modal visible={showCommentaryModal} transparent animationType="slide" onRequestClose={() => setShowCommentaryModal(false)}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop - tap to close */}
          <Pressable
            onPress={() => setShowCommentaryModal(false)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Commentary Card */}
          <View
            style={{
              backgroundColor: 'white',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 32,
              maxHeight: '85%',
              zIndex: 10,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: '#E0E0E0',
                borderRadius: 2,
                alignSelf: 'center',
                marginBottom: 16,
              }}
            />

            {/* Header with close button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '700', color: '#111' }}>
                Commentary {isBibleStudyMode && `(${verseRange})`}
              </Text>
              <Pressable
                onPress={() => setShowCommentaryModal(false)}
                style={({ pressed }) => [
                  {
                    padding: 8,
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </Pressable>
            </View>

            {/* Scrollable content */}
            <ScrollView
              style={{ marginBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {commentaries.length > 0 ? (
                <>
                  {commentaries.map((comment, idx) => (
                    <View key={comment.id} style={{ marginBottom: idx < commentaries.length - 1 ? 24 : 0 }}>
                      {/* Commentator info */}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 12,
                          marginBottom: 16,
                          paddingBottom: 16,
                          borderBottomWidth: 1,
                          borderBottomColor: '#E0E0E0',
                        }}
                      >
                        <View
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: '#E8F5E9',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <MaterialIcons name="person" size={24} color="#2D8659" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111' }}>
                            {comment.author}
                          </Text>
                          <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                            {comment.authorHandle}
                          </Text>
                        </View>
                      </View>

                      {/* Commentary text */}
                      <Text
                        style={{
                          fontSize: 15,
                          lineHeight: 24,
                          color: '#333',
                          marginBottom: 20,
                        }}
                      >
                        {comment.text}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                  <MaterialIcons name="comment" size={48} color="#CCC" />
                  <Text
                    style={{
                      fontSize: 15,
                      color: '#999',
                      marginTop: 12,
                      textAlign: 'center',
                    }}
                  >
                    No commentary available for this {isBibleStudyMode ? 'group' : 'verse'} yet
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            {commentaries.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 12,
                  justifyContent: 'center',
                }}
              >
                <Pressable
                  onPress={handleToggleLike}
                  style={({ pressed }) => [
                    {
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isCommentaryLiked ? '#FFE0E0' : '#F5F5F5',
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <MaterialIcons
                    name={isCommentaryLiked ? 'favorite' : 'favorite-border'}
                    size={24}
                    color={isCommentaryLiked ? '#E91E63' : '#999'}
                  />
                </Pressable>

                <Pressable
                  onPress={handleToggleBookmark}
                  style={({ pressed }) => [
                    {
                      flex: 1,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: '#2D8659',
                      justifyContent: 'center',
                      alignItems: 'center',
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                    Bookmark
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Chapter Complete Modal */}
      <Modal visible={showChapterComplete} transparent animationType="fade" onRequestClose={() => setShowChapterComplete(false)}>
        <ChapterCompleteScreen
          book={book}
          chapter={chapter}
          onMarkAsRead={async () => {
            if (onChapterComplete) {
              await onChapterComplete();
              // Small delay to ensure data is saved
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            setShowChapterComplete(false);
            onClose();
          }}
          onReset={() => {
            if (onReset) onReset();
            setShowChapterComplete(false);
            onClose();
          }}
          onClose={() => {
            setShowChapterComplete(false);
            onClose();
          }}
        />
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowColorPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowColorPicker(false)}
        >
          <Pressable
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              width: '80%',
              maxWidth: 300,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 20, textAlign: 'center' }}>Choose Color</Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 }}>
              {[
                { color: '#FDD835', name: 'Yellow', key: 'yellow' },
                { color: '#81C784', name: 'Green', key: 'green' },
                { color: '#EF5350', name: 'Pink', key: 'pink' },
                { color: '#42A5F5', name: 'Blue', key: 'blue' },
              ].map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleColorSelected(item.key as 'yellow' | 'green' | 'pink' | 'blue')}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: item.color,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: selectedHighlightColor === item.key ? 3 : 0,
                    borderColor: '#333',
                  }}
                >
                  {selectedHighlightColor === item.key && (
                    <MaterialIcons name="check" size={24} color="white" />
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setShowColorPicker(false)}
              style={({ pressed }) => [{
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                opacity: pressed ? 0.8 : 1,
              }]}
            >
              <Text style={{ color: 'white', fontWeight: '600' }}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Chapter Complete Screen Component
function ChapterCompleteScreen({ book, chapter, onMarkAsRead, onReset, onClose }: {
  book: string;
  chapter: number;
  onMarkAsRead: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const confettiScale = useSharedValue(0);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(1);

  useEffect(() => {
    // Trigger success haptic
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Animate in sequence
    // Ring pulse
    ringScale.value = withSequence(
      withTiming(1.2, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1.5, { duration: 300 }),
    );
    ringOpacity.value = withDelay(400, withTiming(0, { duration: 300 }));

    // Checkmark bounces in
    checkScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
    checkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));

    // Confetti burst
    confettiScale.value = withDelay(400, withSequence(
      withSpring(1.1, { damping: 6, stiffness: 120 }),
      withTiming(1, { duration: 200 }),
    ));

    // Text fades in
    textOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));

    // Buttons fade in
    buttonsOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
  }, []);

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
    opacity: checkOpacity.value,
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonsAnimStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const confettiAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: confettiScale.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#2D8659' }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [{
            position: 'absolute',
            top: 28,
            right: 28,
            padding: 8,
            opacity: pressed ? 0.6 : 1,
            zIndex: 10,
          }]}
        >
          <MaterialIcons name="close" size={28} color="white" />
        </Pressable>

        {/* Animated checkmark area */}
        <View style={{ alignItems: 'center', marginBottom: 40, height: 160, justifyContent: 'center' }}>
          {/* Ring pulse */}
          <Animated.View style={[{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            borderWidth: 4,
            borderColor: 'rgba(255,255,255,0.5)',
          }, ringAnimStyle]} />

          {/* Confetti dots */}
          <Animated.View style={[{ position: 'absolute', width: 160, height: 160 }, confettiAnimStyle]}>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: 80 + Math.sin((angle * Math.PI) / 180) * 65 - 5,
                  left: 80 + Math.cos((angle * Math.PI) / 180) * 65 - 5,
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F59E0B', '#EC4899', '#10B981', '#60A5FA'][i],
                }}
              />
            ))}
          </Animated.View>

          {/* Checkmark circle */}
          <Animated.View style={[{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 3,
            borderColor: 'white',
            zIndex: 5,
          }, checkAnimStyle]}>
            <MaterialIcons name="check" size={64} color="white" />
          </Animated.View>
        </View>

        {/* Text */}
        <Animated.View style={[{ alignItems: 'center', marginBottom: 48 }, textAnimStyle]}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: 'white', marginBottom: 8, textAlign: 'center' }}>
            Chapter Complete!
          </Text>
          <Text style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
            {book} {chapter}
          </Text>
        </Animated.View>

        {/* Buttons */}
        <Animated.View style={[{ width: '100%', gap: 16 }, buttonsAnimStyle]}>
          <Pressable
            onPress={onMarkAsRead}
            style={({ pressed }) => [{
              backgroundColor: 'white',
              paddingVertical: 16,
              borderRadius: 28,
              alignItems: 'center',
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            }]}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#2D8659' }}>Mark as Read</Text>
          </Pressable>

          <Pressable
            onPress={onReset}
            style={({ pressed }) => [{
              backgroundColor: 'rgba(255,255,255,0.15)',
              paddingVertical: 16,
              borderRadius: 28,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.4)',
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            }]}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: 'white' }}>Reset</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
