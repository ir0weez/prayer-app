import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useRef } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { BibleSection, BibleVerse } from '@/lib/bible-section-parser';
import { saveBookmark } from '@/lib/bible-bookmark';

interface BibleStoryViewerProps {
  visible: boolean;
  section: BibleSection | null;
  onClose: () => void;
  onComplete?: () => void;
  onReset?: () => void;
  book: string;
  chapter: number;
  version?: 'kjv' | 'csb';
}

export function BibleStoryViewer({
  visible,
  section,
  onClose,
  onComplete,
  onReset,
  book,
  chapter,
  version = 'kjv',
}: BibleStoryViewerProps) {
  const colors = useColors();
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { width, height } = Dimensions.get('window');
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setCurrentVerseIndex(0);
      scaleAnim.setValue(1);
      opacityAnim.setValue(1);
    }
  }, [visible, section]);

  // Trigger animation when verse changes
  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]),
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 150,
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  }, [currentVerseIndex]);

  const handleBookmark = async () => {
    if (section && currentVerse) {
      await saveBookmark(book, chapter, currentVerse.verse, version);
      setIsBookmarked(true);
      setTimeout(() => setIsBookmarked(false), 1000);
    }
  };

  if (!section || section.verses.length === 0) {
    return null;
  }

  const currentVerse = section.verses[currentVerseIndex];
  const isLastVerse = currentVerseIndex === section.verses.length - 1;
  const backgroundColor = '#2D8659';

  const handleNext = () => {
    if (isLastVerse) {
      onComplete?.();
      onClose();
    } else {
      setCurrentVerseIndex(currentVerseIndex + 1);
      setIsBookmarked(false);
    }
  };

  const handlePrevious = () => {
    if (currentVerseIndex > 0) {
      setCurrentVerseIndex(currentVerseIndex - 1);
      setIsBookmarked(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
        }}
      >
        {/* Apple Music-style gradient background */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: backgroundColor,
          }}
        >
          {/* Radial-like gradient effect: darker edges, lighter center */}
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: 'rgba(45, 134, 89, 0.3)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '50%',
              backgroundColor: 'rgba(20, 80, 50, 0.4)',
            }}
          />
        </View>

        {/* Progress bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.3)',
            zIndex: 10,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${((currentVerseIndex + 1) / section.verses.length) * 100}%`,
              backgroundColor: 'rgba(255,255,255,0.8)',
            }}
          />
        </View>

        {/* Section title - top */}
        <Text
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            right: 16,
            fontSize: 14,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: '500',
            zIndex: 10,
          }}
          numberOfLines={1}
        >
          {section.title}
        </Text>

        {/* Main content area - FLEXBOX CENTERED */}
        <Animated.View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 60,
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
            zIndex: 5,
          }}
        >
          {/* Verse number */}
          <Text
            style={{
              fontSize: 56,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.95)',
              marginBottom: 20,
              textAlign: 'center',
            }}
          >
            {currentVerse.verse}
          </Text>

          {/* Verse text - FULLY CENTERED */}
          <Text
            style={{
              fontSize: 24,
              lineHeight: 38,
              color: 'white',
              textAlign: 'center',
              fontFamily: 'Georgia',
              fontWeight: '500',
              marginBottom: 40,
            }}
          >
            {currentVerse.text}
          </Text>

          {/* Bookmark button */}
          <Pressable
            onPress={handleBookmark}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: isBookmarked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: isBookmarked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              {isBookmarked ? '✓ Bookmarked' : 'Bookmark'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Navigation areas */}
        <View style={{ flexDirection: 'row', flex: 1, width: '100%', zIndex: 5 }}>
          {/* Previous button */}
          <Pressable
            onPress={handlePrevious}
            disabled={currentVerseIndex === 0}
            style={{
              flex: 1,
              opacity: currentVerseIndex === 0 ? 0.3 : 1,
            }}
          />

          {/* Next button */}
          <Pressable
            onPress={handleNext}
            style={{
              flex: 1,
            }}
          />
        </View>

        {/* Close button - BOTTOM LEFT */}
        <Pressable
          onPress={onClose}
          style={{
            position: 'absolute',
            bottom: 24,
            left: 24,
            zIndex: 20,
            padding: 12,
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: 24,
          }}
        >
          <MaterialIcons name="close" size={28} color="white" />
        </Pressable>

        {/* Reset button - BOTTOM CENTER (only show if not last verse) */}
        {!isLastVerse && onReset && (
          <Pressable
            onPress={onReset}
            style={{
              position: 'absolute',
              bottom: 24,
              alignSelf: 'center',
              zIndex: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 20,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.4)',
            }}
          >
            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
              Reset Chapter
            </Text>
          </Pressable>
        )}

        {/* Verse counter - BOTTOM RIGHT */}
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            backgroundColor: 'rgba(0,0,0,0.3)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            zIndex: 20,
          }}
        >
          <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
            {currentVerseIndex + 1} / {section.verses.length}
          </Text>
        </View>

        {/* Completion indicator */}
        {isLastVerse && (
          <View
            style={{
              position: 'absolute',
              bottom: 80,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              zIndex: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>
              Tap to complete
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
