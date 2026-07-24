import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  Dimensions,
  SafeAreaView,
  Animated,
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
  
  // Multiple animation values for layered Material Design effect
  const wave1Opacity = useRef(new Animated.Value(0.15)).current;
  const wave2Opacity = useRef(new Animated.Value(0.08)).current;
  const wave3Opacity = useRef(new Animated.Value(0.12)).current;
  
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible && section) {
      setCurrentVerseIndex(0);
      // Reset animations to start state
      wave1Opacity.setValue(0.15);
      wave2Opacity.setValue(0.08);
      wave3Opacity.setValue(0.12);
      // Start background animation loop
      startBackgroundAnimation();
    } else {
      // Stop animation when modal closes
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
    }

    return () => {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current = null;
      }
    };
  }, [visible, section]);

  const startBackgroundAnimation = () => {
    const animation = Animated.loop(
      Animated.parallel([
        // Wave 1: slow, long cycle
        Animated.sequence([
          Animated.timing(wave1Opacity, {
            toValue: 0.35,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.timing(wave1Opacity, {
            toValue: 0.15,
            duration: 4000,
            useNativeDriver: true,
          }),
        ]),
        // Wave 2: medium speed, offset
        Animated.sequence([
          Animated.timing(wave2Opacity, {
            toValue: 0.25,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(wave2Opacity, {
            toValue: 0.08,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        // Wave 3: faster, different offset
        Animated.sequence([
          Animated.timing(wave3Opacity, {
            toValue: 0.28,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(wave3Opacity, {
            toValue: 0.12,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    loopRef.current = animation;
    animation.start();
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
        {/* Static base background */}
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

        {/* Animated wave layer 1 - slow, subtle */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.08)',
            opacity: wave1Opacity,
          }}
        />

        {/* Animated wave layer 2 - medium speed */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.12)',
            opacity: wave2Opacity,
          }}
        />

        {/* Animated wave layer 3 - faster, more visible */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.1)',
            opacity: wave3Opacity,
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
            zIndex: 100,
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

        {/* Main content area - centered, pointer-events none so taps pass through */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
            paddingVertical: 40,
            zIndex: 5,
            pointerEvents: 'none',
          }}
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

          {/* Bookmark button - re-enable pointer events */}
          <Pressable
            onPress={handleBookmark}
            pointerEvents="auto"
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
        </View>

        {/* Navigation - Left tap area */}
        <Pressable
          onPress={handlePrevious}
          disabled={currentVerseIndex === 0}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '50%',
            zIndex: 10,
          }}
        />

        {/* Navigation - Right tap area */}
        <Pressable
          onPress={handleNext}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '50%',
            zIndex: 10,
          }}
        />

        {/* Close button - BOTTOM LEFT */}
        <Pressable
          onPress={onClose}
          pointerEvents="auto"
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
          pointerEvents="auto"
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
            pointerEvents="none"
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
