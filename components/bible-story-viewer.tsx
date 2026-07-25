import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { BibleSection, BibleVerse } from '@/lib/bible-section-parser';
import { saveBookmark } from '@/lib/bible-bookmark';

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
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    if (visible && section) {
      setCurrentVerseIndex(0);
    }
  }, [visible, section]);

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
              Commentary
            </Text>
          </Pressable>
        </View>

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

        {/* Close on tap outside (center area is for content only) */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            top: 0,
            left: '30%',
            right: '30%',
            height: 60,
            zIndex: 5,
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}
