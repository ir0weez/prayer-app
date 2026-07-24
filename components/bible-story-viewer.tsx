import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  Animated,
  ScrollView,
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
  
  // Animation values for Material Design background
  const bgOpacity = useRef(new Animated.Value(0.3)).current;
  const bgScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setCurrentVerseIndex(0);
      // Start background animation loop
      startBackgroundAnimation();
    }
  }, [visible, section]);

  const startBackgroundAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(bgOpacity, {
            toValue: 0.6,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(bgScale, {
            toValue: 1.1,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
        Animated.parallel([
          Animated.timing(bgOpacity, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(bgScale, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
        ]),
      ])
    ).start();
  };

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
        {/* Animated Material Design Background */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor,
            opacity: bgOpacity,
            transform: [{ scale: bgScale }],
          }}
        />

        {/* Static background layer */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor,
          }}
        />

        {/* Progress bar */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: 'rgba(255,255,255,0.2)',
            zIndex: 10,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${((currentVerseIndex + 1) / section.verses.length) * 100}%`,
              backgroundColor: 'rgba(255,255,255,0.9)',
            }}
          />
        </View>

        {/* Main scrollable content area */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
          }}
          scrollEnabled={false}
          style={{ flex: 1, zIndex: 5 }}
        >
          {/* Verse number - Large and centered */}
          <Text
            style={{
              fontSize: 64,
              fontWeight: '700',
              color: 'rgba(255,255,255,0.95)',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            {currentVerse.verse}
          </Text>

          {/* Verse text - Fully centered and readable */}
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
            style={{
              paddingHorizontal: 20,
              paddingVertical: 10,
              backgroundColor: isBookmarked ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: isBookmarked ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
              {isBookmarked ? '✓ Bookmarked' : 'Bookmark'}
            </Text>
          </Pressable>
        </ScrollView>

        {/* Navigation areas - tap left/right to navigate */}
        <View style={{ flexDirection: 'row', flex: 0.15, width: '100%', zIndex: 5 }}>
          {/* Previous button */}
          <Pressable
            onPress={handlePrevious}
            disabled={currentVerseIndex === 0}
            style={{
              flex: 1,
              opacity: currentVerseIndex === 0 ? 0.2 : 1,
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
            bottom: 28,
            left: 28,
            zIndex: 20,
            padding: 14,
            backgroundColor: 'rgba(0,0,0,0.25)',
            borderRadius: 28,
          }}
        >
          <MaterialIcons name="close" size={32} color="white" />
        </Pressable>

        {/* Verse counter - BOTTOM RIGHT */}
        <View
          style={{
            position: 'absolute',
            bottom: 28,
            right: 28,
            backgroundColor: 'rgba(0,0,0,0.25)',
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

        {/* Completion indicator */}
        {isLastVerse && (
          <View
            style={{
              position: 'absolute',
              bottom: 90,
              alignSelf: 'center',
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 24,
              zIndex: 20,
            }}
          >
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>
              Tap to complete
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
