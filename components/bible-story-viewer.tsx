import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { BibleSection, BibleVerse } from '@/lib/bible-section-parser';
import { saveBookmark } from '@/lib/bible-bookmark';
import {
  getCommentary,
  toggleLikeCommentary,
  toggleBookmarkCommentary,
  CommentaryNote,
} from '@/lib/commentary-data';

interface BibleStoryViewerProps {
  visible: boolean;
  section: BibleSection | null;
  onClose: () => void;
  onComplete?: () => void;
  book: string;
  chapter: number;
  version?: 'kjv' | 'csb';
}

export function BibleStoryViewer({
  visible,
  section,
  onClose,
  onComplete,
  book,
  chapter,
  version = 'kjv',
}: BibleStoryViewerProps) {
  const colors = useColors();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showCommentaryModal, setShowCommentaryModal] = useState(false);
  const [isCommentaryLiked, setIsCommentaryLiked] = useState(false);
  const [commentary, setCommentary] = useState<CommentaryNote | null>(null);
  const [isLoadingCommentary, setIsLoadingCommentary] = useState(false);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible && section) {
      setCurrentVerseIndex(0);
      loadCommentary();
    }
  }, [visible, section]);

  useEffect(() => {
    loadCommentary();
  }, [currentVerseIndex]);

  const loadCommentary = async () => {
    if (!section) return;
    setIsLoadingCommentary(true);
    const verse = section.verses[currentVerseIndex];
    const data = await getCommentary(book, chapter, verse.verse);
    setCommentary(data);
    setIsCommentaryLiked(data?.isLikedByUser ?? false);
    setIsLoadingCommentary(false);
  };

  const handleToggleLike = async () => {
    if (!commentary) return;
    await toggleLikeCommentary(commentary.id);
    setIsCommentaryLiked(!isCommentaryLiked);
    await loadCommentary();
  };

  const handleToggleBookmark = async () => {
    if (!commentary) return;
    await toggleBookmarkCommentary(commentary.id);
    await loadCommentary();
  };

  if (!section) return null;

  const currentVerse = section.verses[currentVerseIndex];
  const isLastVerse = currentVerseIndex === section.verses.length - 1;

  const handleNextVerse = () => {
    if (currentVerseIndex < section.verses.length - 1) {
      setCurrentVerseIndex(currentVerseIndex + 1);
    } else if (isLastVerse && onComplete) {
      onComplete();
    }
  };

  const handlePreviousVerse = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
    }
  };

  const handleBookmark = async () => {
    if (currentVerse) {
      await saveBookmark(book, chapter, currentVerse.verse, version);
      setIsBookmarked(!isBookmarked);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: '#2D8659',
          }}
        >
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
              {/* Verse number */}
              <Text
                style={{
                  fontSize: 64,
                  fontWeight: '700',
                  color: 'white',
                  marginBottom: 24,
                  textAlign: 'center',
                }}
              >
                {currentVerse.verse}
              </Text>

              {/* Verse text */}
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
                {currentVerse.text}
              </Text>

              {/* Bookmark button */}
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
                {commentary ? 'View' : 'No'} Commentary
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

          {/* Verse counter - BOTTOM RIGHT */}
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
              {currentVerseIndex + 1} / {section.verses.length}
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
                Commentary
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
              {commentary ? (
                <>
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
                        {commentary.author}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
                        {commentary.authorHandle}
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
                    {commentary.text}
                  </Text>
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
                    No commentary available for this verse yet
                  </Text>
                </View>
              )}
            </ScrollView>

            {/* Action buttons */}
            {commentary && (
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
    </>
  );
}
