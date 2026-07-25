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
  
  // Animated value for radial glow effect (like Apple Music)
  const glowScale = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible && section) {
      setCurrentVerseIndex(0);
      glowScale.setValue(1);
      startGlowAnimation();
    } else {
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

  const startGlowAnimation = () => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.3,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    loopRef.current = animation;
    animation.start();
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#2D8659',
        }}
      >
        {/* Animated radial gradient background (green sun effect) */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#2D8659',
          }}
        >
          {/* Static gradient base */}
          <View
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              width: 400,
              height: 400,
              marginLeft: -200,
              borderRadius: 200,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />

          {/* Animated glow layer */}
          <Animated.View
            style={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              width: 400,
              height: 400,
              marginLeft: -200,
              borderRadius: 200,
              backgroundColor: 'rgba(255,255,255,0.15)',
              transform: [{ scale: glowScale }],
            }}
          />

          {/* Darker overlay for depth */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              backgroundColor: 'rgba(0,0,0,0.2)',
            }}
          />
        </View>

        {/* Content container */}
        <View
          style={{
            flex: 1,
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          {/* Top section - verse content */}
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24,
              paddingVertical: 40,
              pointerEvents: 'none',
            }}
          >
            {/* Verse number */}
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

          {/* Bottom section - commentary card */}
          <View
            style={{
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.1)',
              paddingVertical: 12,
              paddingHorizontal: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="person" size={16} color="white" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: 'white' }}>
                  Commentary
                </Text>
              </View>
            </View>
            <Text
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              Future notes will be here
            </Text>
          </View>
        </View>

        {/* Close button - TOP LEFT */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            {
              position: 'absolute',
              top: 28,
              left: 28,
              zIndex: 20,
              padding: 14,
              backgroundColor: 'rgba(0,0,0,0.25)',
              borderRadius: 28,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
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
